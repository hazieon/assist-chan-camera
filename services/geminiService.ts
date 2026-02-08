
import { GoogleGenAI, Content, Type } from '@google/genai';
import { InstructionSet, ChatMessage, Role } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const FAST_MODEL = 'gemini-3-flash-preview';

/**
 * Fetches instructions either from a direct URL, web search query, or an image.
 */
export const getInstructions = async (input: string, imageData?: { data: string, mimeType: string }): Promise<InstructionSet> => {
    const isUrl = !imageData && (input.startsWith('http') || input.includes('.com') || input.includes('.org') || input.includes('.net'));
    
    let contents: any;
    
    if (imageData) {
        contents = {
            parts: [
                {
                    inlineData: {
                        data: imageData.data,
                        mimeType: imageData.mimeType
                    }
                },
                {
                    text: `Analyze this image carefully. It may contain a recipe, product packaging, or a set of printed instructions.
                    
                    TASK:
                    1. Perform high-accuracy OCR to extract the title, materials/ingredients, and steps.
                    2. If it's food packaging, look specifically for cooking times, oven temperatures, and expiration dates.
                    3. If a section (like materials) is absolutely not present, return an empty array [] for that field.
                    4. IMPORTANT: In the "steps" array, include specific quantities/amounts directly in the text whenever they are mentioned in the original text.
                    5. Detect the language and return everything in that language.
                    
                    EXPECTED JSON SCHEMA:
                    {
                      "title": "string (the main heading found)",
                      "materials": ["string array of ingredients or tools"],
                      "steps": ["string array of detailed instructions"],
                      "isFood": boolean (true if it's a recipe or food package),
                      "hasAnimalProducts": boolean,
                      "language": "string (e.g. en, fr, es)",
                      "cookingTime": "string (optional)",
                      "ovenTemp": "string (optional)",
                      "expiryDate": "string (optional)"
                    }
                    
                    Return ONLY the JSON string.`
                }
            ]
        };
    } else {
        const prompt = isUrl 
            ? `URL: ${input}. Extract instructions from this specific page. 
               IMPORTANT: 
               1. Include specific quantities/amounts of each material directly in the steps text every time they are mentioned.
               2. Detect the language of the source page and provide the entire JSON response (title, materials, steps) in that SAME language.
               JSON format: {"title":string, "materials":string[], "steps":string[], "isFood":boolean, "hasAnimalProducts":boolean, "language":string}. No extra text.`
            : `Search for the best and most appropriate instructions or recipe for: "${input}". 
               IMPORTANT: 
               1. Include specific quantities/amounts of each material directly in the steps text every time they are mentioned.
               2. Detect the language of the search query and provide the entire JSON response (title, materials, steps) in that SAME language.
               Extract the instructions in detail. 
               JSON format: {"title":string, "materials":string[], "steps":string[], "isFood":boolean, "hasAnimalProducts":boolean, "language":string}. No extra text.`;
        contents = prompt;
    }

    try {
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: contents,
            config: {
                tools: !imageData ? [{ googleSearch: {} }] : undefined,
                responseMimeType: "application/json"
            },
        });
        
        const text = response.text.trim();
        const parsed = JSON.parse(text) as InstructionSet;
        
        // Final sanitization to prevent 'some' of undefined errors
        parsed.materials = parsed.materials || [];
        parsed.steps = parsed.steps || [];
        
        // Extract sources from grounding metadata if searching web
        if (!imageData) {
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            let sources = chunks
                ? chunks.map(c => c.web).filter(w => w?.uri).map(w => ({ uri: w!.uri, title: w!.title || 'Reference' }))
                : [];

            if (isUrl) {
                const hasOriginal = sources.some(s => s.uri === input);
                if (!hasOriginal) {
                    sources.unshift({ uri: input, title: 'Original Page' });
                } else {
                    sources = [
                        sources.find(s => s.uri === input)!,
                        ...sources.filter(s => s.uri !== input)
                    ];
                }
            }
            parsed.sources = sources;
        }
        
        return parsed;
    } catch (error) {
        console.error("Extraction error:", error);
        throw new Error("I couldn't read the text clearly. Please try a more focused photo with better lighting.");
    }
};

/**
 * Detects if the user wants to change the current item, read a specific step, or search for something new.
 */
export const detectModificationIntent = async (message: string): Promise<string | null> => {
    const prompt = `User said: "${message}". 
    Categorize user intent strictly into one of these:
    1. READ_STEP_X: If they ask to read, repeat, or explain a specific numbered step (e.g., "step 3", "what was the third step", "read step five"). Replace X with the actual digit.
    2. NEW_TOPIC: If they ask for something entirely different (e.g., "show me pizza instead", "how to fix a bike").
    3. MODIFICATION: If they want to change the current instructions (e.g., "scale to 4 people", "convert to grams", "make it vegan"). Return a 3-word summary of the modification.
    4. FALSE: If it's just a general question about the instructions (e.g., "what temperature should I use?", "is this healthy?").
    
    Response format: ONLY the category string. No punctuation.`;
    
    try {
        const response = await ai.models.generateContent({ model: FAST_MODEL, contents: prompt });
        const text = response.text.trim().toUpperCase();
        if (text.includes("NEW_TOPIC")) return "NEW_TOPIC";
        if (text.startsWith("READ_STEP_")) return text;
        return text === "FALSE" ? "FALSE" : text;
    } catch (error) {
        return null;
    }
};

export const modifyInstructions = async (
    instructions: InstructionSet,
    modificationPrompt: string
): Promise<InstructionSet> => {
    const prompt = `Update the following JSON instructions based on this request: "${modificationPrompt}".
    
    CRITICAL RULES: 
    1. Include specific quantities/amounts of each material directly in the steps text every time they are mentioned.
    2. MAINTAIN the language of the current instructions (${instructions.language || 'detected language'}). All fields in the JSON must be in this language.
    
    Current Data: ${JSON.stringify(instructions)}. 
    
    If vegan swap is requested: remove ALL animal products (meat/dairy/eggs) and replace with plant-based alternatives. 
    IMPORTANT: Ensure the output is JUST the updated JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text.trim();
        const parsed = JSON.parse(text) as InstructionSet;
        parsed.materials = parsed.materials || [];
        parsed.steps = parsed.steps || [];
        parsed.isFood = instructions.isFood;
        parsed.language = instructions.language;
        if (instructions.sources) parsed.sources = instructions.sources;
        if (instructions.sustainabilitySuggestion) parsed.sustainabilitySuggestion = instructions.sustainabilitySuggestion;
        
        return parsed;
    } catch (error) {
        throw new Error("Update failed.");
    }
};

export const getSustainableSuggestion = async (title: string, materials: string[]): Promise<string | null> => {
    if (!materials || materials.length === 0) return null;
    const prompt = `Recipe: "${title}". Give one very brief vegan alternative idea (5-10 words) in the same language as the title.`;
    try {
        const response = await ai.models.generateContent({ model: FAST_MODEL, contents: prompt });
        return response.text.trim();
    } catch (error) {
        return null;
    }
};

export const getChatResponse = async (
    instructions: InstructionSet,
    history: ChatMessage[],
    newMessage: string,
    completedSteps: boolean[]
): Promise<string> => {
    const done = completedSteps.map((v, i) => v ? i + 1 : -1).filter(i => i !== -1);
    const system = `You are a helpful assistant for: ${instructions.title}. 
    - Answer questions about the steps or materials.
    - Be concise. 
    - RESPOND in the language used in the instructions (${instructions.language || 'detected language'}).
    - NEVER list the materials or ALL steps in the chat if not asked specifically for details. 
    - If user asks for a specific step's text, give a brief summary, as the app will read the exact text separately.
    Steps count: ${instructions.steps.length}. Completed steps indexes: ${done.join(',')}.`;

    const contents: Content[] = [
        ...history.map(msg => ({
            role: msg.role === Role.USER ? 'user' : 'model' as any,
            parts: [{ text: msg.content }],
        })),
        { role: 'user', parts: [{ text: newMessage }] }
    ];

    try {
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: contents,
            config: { systemInstruction: system }
        });
        return response.text;
    } catch (error) {
        return "I'm sorry, I can't answer that right now.";
    }
};
