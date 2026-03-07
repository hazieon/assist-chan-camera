
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
    
    const systemInstruction = `You are an expert at extracting structured instructions from web content or images.
    
    CRITICAL EXTRACTION RULE: You MUST extract instructions ONLY from the provided source (URL, Search Result, or Image). 
    DO NOT use your own training data or general knowledge for the specific recipe/instructions. 
    If the source does not contain clear instructions, return a JSON with "title": "Error: No instructions found".
    
    MANDATORY STEP FORMATTING: In the "steps" array, you MUST repeat the specific quantities or amounts for every ingredient whenever they are mentioned. For example, instead of "Add the flour", say "Add the 250g of flour".
    
    LANGUAGE: Detect the language of the source and return the JSON in that exact language.
    
    WELCOME MESSAGE: Generate a "welcomeMessage" in the detected language. This message MUST state: "I have successfully extracted the instructions for [Title] exclusively from the provided source. Note that you can use the 'eco version' button to see a sustainable alternative or use the metric conversion tools to adjust the units. Ask me any questions or to make any changes. When you are ready to begin, press the start button to go into hands free mode." (translated naturally).
    
    JSON format: {"title":string, "materials":string[], "steps":string[], "isFood":boolean, "hasAnimalProducts":boolean, "language":string, "welcomeMessage":string, "cookingTime"?:string, "ovenTemp"?:string}.
    Return ONLY the JSON string.`;

    let contents: any;
    if (imageData) {
        contents = {
            parts: [
                { inlineData: { data: imageData.data, mimeType: imageData.mimeType } },
                { text: "Extract instructions from this image." }
            ]
        };
    } else {
        contents = isUrl ? `Extract instructions from this URL: ${input}` : `Search for and extract instructions for: "${input}"`;
    }

    try {
        const tools: any[] = [];
        if (!imageData) {
            if (isUrl) {
                tools.push({ urlContext: {} });
            } else {
                tools.push({ googleSearch: {} });
            }
        }

        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                tools: tools.length > 0 ? tools : undefined,
                responseMimeType: "application/json"
            },
        });
        
        const text = response.text.trim();
        let parsed: InstructionSet;
        
        try {
            parsed = JSON.parse(text) as InstructionSet;
        } catch (e) {
            // Fallback: try to find JSON block if model returned extra text
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]) as InstructionSet;
            } else {
                throw new Error("Invalid JSON response from model");
            }
        }
        
        parsed.materials = parsed.materials || [];
        parsed.steps = parsed.steps || [];
        
        if (!imageData) {
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const sources = chunks
                ? chunks.map(c => c.web).filter(w => w?.uri).map(w => ({ uri: w!.uri, title: w!.title || 'Source' }))
                : [];

            if (isUrl) {
                const alreadyIncluded = sources.find(s => s.uri === input);
                if (!alreadyIncluded) {
                    sources.unshift({ uri: input, title: parsed.title || 'Original Source' });
                }
            }
            parsed.sources = sources;
        }
        
        return parsed;
    } catch (error: any) {
        console.error("Extraction error:", error);
        throw new Error("Failed to extract instructions exclusively from the provided source.");
    }
};

export const detectModificationIntent = async (message: string, currentLang: string = 'en-US'): Promise<{type: string, summary: string} | null> => {
    const prompt = `User message: "${message}". Instructions language: ${currentLang}.
    Determine if this is a request to MODIFY the current instructions (scaling, unit conversion, eco-mode, language translation, etc.).
    Return JSON: {"type": "MODIFICATION" | "FALSE", "summary": "A short description of the requested modification in ${currentLang}"}`;
    
    try {
        const response = await ai.models.generateContent({ 
            model: FAST_MODEL, 
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        return null;
    }
};

export const modifyInstructions = async (
    instructions: InstructionSet,
    modificationPrompt: string
): Promise<InstructionSet> => {
    const prompt = `Update the following instruction set JSON based on this request: "${modificationPrompt}".
    CRITICAL RULE: In the "steps" array, you MUST repeat the specific quantities and amounts for each ingredient inside the text of the step.
    LANGUAGE RULE: If the user asks to change the language (e.g., "Translate to Spanish"), fulfill that request and update the "language" field to the new BCP-47 tag. Otherwise, maintain the original language (${instructions.language || 'en-US'}).
    JSON: ${JSON.stringify(instructions)}.
    Return ONLY JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const parsed = JSON.parse(response.text.trim()) as InstructionSet;
        parsed.sources = instructions.sources;
        return parsed;
    } catch (error) {
        throw new Error("Could not update the instructions.");
    }
};

export const getChatResponse = async (
    instructions: InstructionSet,
    history: ChatMessage[],
    newMessage: string,
    completedSteps: boolean[]
): Promise<{ text: string, language: string }> => {
    const system = `You are a professional assistant helping with the recipe: "${instructions.title}".
    
    RECIPE CONTEXT:
    - Materials/Ingredients: ${instructions.materials.join(', ')}
    - Steps: ${instructions.steps.join(' | ')}
    - Current Progress: ${completedSteps.map((c, i) => `Step ${i+1}: ${c ? 'Completed' : 'Pending'}`).join(', ')}

    STRICT RULES:
    1. ONLY provide instructions, materials, or advice that is directly contained within or derived from the provided RECIPE CONTEXT.
    2. DO NOT suggest external ingredients, alternative methods, or additional steps not found in the original recipe.
    3. If the user asks for something outside this context, politely explain that you can only assist with the specific recipe provided.
    4. Respond in the language the user is using (Multilingual support).
    5. Be helpful, concise, and polite.

    RETURN FORMAT: Return a JSON object with "text" (your response) and "language" (the BCP-47 language tag of your response).`;

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
            config: { 
                systemInstruction: system,
                responseMimeType: "application/json"
            }
        });
        const parsed = JSON.parse(response.text.trim());
        return {
            text: parsed.text || "I'm sorry, I couldn't generate a response.",
            language: parsed.language || instructions.language || 'en-US'
        };
    } catch (error) {
        return { text: "I'm sorry, I'm having trouble processing that right now.", language: 'en-US' };
    }
};
