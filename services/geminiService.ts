
import { GoogleGenAI, Content, Type } from '@google/genai';
import { InstructionSet, ChatMessage, Role } from '../types';

// Support both platform-standard and Vite-standard environment variables
const getApiKey = () => {
    const key = process.env.GEMINI_API_KEY || 
                process.env.API_KEY || 
                (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY);
    return key;
};

const apiKey = getApiKey();

if (!apiKey || apiKey === 'undefined') {
    console.error("❌ GEMINI_API_KEY is missing! The app will fail to fetch recipes.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });
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
                    text: `Analyze this image. 
                    1. Extract Title, Materials/Ingredients, and Steps.
                    2. MANDATORY: In the "steps" array, you MUST repeat the specific quantities or amounts for every ingredient whenever they are mentioned. For example, instead of "Add the flour", say "Add the 250g of flour".
                    3. Detect and return the BCP-47 language tag of the text in the image.
                    4. Generate a "welcomeMessage" in the detected language. This message MUST state: "I have successfully extracted the instructions for [Title]. Note that you can use the 'eco version' button to see a sustainable alternative or use the metric conversion tools to adjust the units. Ask me any questions or to make any changes. When you are ready to begin, press the start button to go into hands free mode." (translated naturally into the detected language).
                    
                    JSON format: {"title":string, "materials":string[], "steps":string[], "isFood":boolean, "hasAnimalProducts":boolean, "language":string, "welcomeMessage":string, "cookingTime"?:string, "ovenTemp"?:string}.
                    Return ONLY the JSON string.`
                }
            ]
        };
    } else {
        const prompt = isUrl 
            ? `URL: ${input}. 
               CRITICAL EXTRACTION RULE: You MUST extract instructions ONLY from the content found at this specific URL. 
               DO NOT use your own training data for this recipe. DO NOT pull from other search results or similar websites.
               If the page at this URL does not contain instructions or a recipe, return an error in the "title" field.
               MANDATORY: In the "steps" array, repeat specific quantities/amounts for every ingredient mentioned (e.g., "Add 200ml of water").
               Detect the page language and return JSON in that exact language.
                Generate a "welcomeMessage" in the detected language. This message MUST state: "I have successfully extracted the instructions for [Title] from the provided link. Note that you can use the 'eco version' button to see a sustainable alternative or use the metric conversion tools to adjust the units. Ask me any questions or to make any changes. When you are ready to begin, press the start button to go into hands free mode." (translated naturally into the detected language).
               JSON format: {"title":string, "materials":string[], "steps":string[], "isFood":boolean, "hasAnimalProducts":boolean, "language":string, "welcomeMessage":string}. Return ONLY the JSON string.`
            : `Search for instructions for: "${input}". 
               MANDATORY: In the "steps" array, repeat quantities for every ingredient mentioned.
               Return JSON in the language of the query.
               Generate a "welcomeMessage" in the detected language. This message MUST state: "I have successfully extracted the instructions for [Title]. Note that you can use the 'eco version' button to see a sustainable alternative or use the metric conversion tools to adjust the units. Ask me any questions or to make any changes. When you are ready to begin, press the start button to go into hands free mode." (translated naturally into the detected language).
               JSON format: {"title":string, "materials":string[], "steps":string[], "isFood":boolean, "hasAnimalProducts":boolean, "language":string, "welcomeMessage":string}. Return ONLY the JSON string.`;
        contents = prompt;
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
                tools: tools.length > 0 ? tools : undefined,
                responseMimeType: "application/json"
            },
        });
        
        const text = response.text.trim();
        const parsed = JSON.parse(text) as InstructionSet;
        
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
        console.error("Gemini API Error:", error);
        
        if (error?.message?.includes('403') || error?.status === 403) {
            throw new Error("API Access Forbidden (403). Please ensure the 'Generative Language API' is enabled in your Google Cloud Project and your API key is not restricted.");
        }
        
        throw new Error("Failed to extract instructions. Please check your connection or the source content.");
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
