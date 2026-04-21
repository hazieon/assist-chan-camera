
import { GoogleGenAI, Content, Type } from '@google/genai';
import { InstructionSet, ChatMessage, Role } from '../types';

// Support both platform-standard and Vite-standard environment variables
const getApiKey = () => {
    const key = process.env.GEMINI_API_KEY || 
                process.env.API_KEY || 
                ((import.meta as any).env && (import.meta as any).env.VITE_GEMINI_API_KEY);
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
                    text: `Analyse this image. 
                    1. RELEVANCE CHECK: Only proceed if the image contains instructions, a recipe, ingredients, tools, or a workspace related to a task (cooking, DIY, assembly, etc.). If the image is off-topic, irrelevant, or inappropriate, return a JSON with "title": "Error: Irrelevant Content" and an empty steps array.
                    2. Extract Title, Materials/Ingredients, and Steps.
                    3. MANDATORY: In the "steps" array, you MUST repeat the specific quantities or amounts for every ingredient whenever they are mentioned. For example, instead of "Add the flour", say "Add the 250g of flour".
                    4. Detect and return the BCP-47 language tag of the text in the image.
                    5. Generate a "welcomeMessage" in the detected language. This message MUST state: "I have successfully extracted the instructions for [Title]. Note that you can use the 'eco version' button to see a sustainable alternative or use the metric conversion tools to adjust the units. Ask me any questions or to make any changes. When you are ready to begin, press the start button to go into hands-free mode." (translated naturally into the detected language).
                    
                    JSON format: {"title":string, "materials":string[], "steps":string[], "isFood":boolean, "hasAnimalProducts":boolean, "language":string, "welcomeMessage":string, "cookingTime"?:string, "ovenTemp"?:string}.
                    Return ONLY the JSON string.`
                }
            ]
        };
    } else {
        const prompt = isUrl 
            ? `URL: ${input}. 
               RELEVANCE CHECK: Only extract instructions if they are related to a task (cooking, DIY, assembly, etc.). If the content is off-topic, irrelevant, or inappropriate, return a JSON with "title": "Error: Irrelevant Content" and an empty steps array.
               CRITICAL EXTRACTION RULE: You MUST extract instructions ONLY from the content found at this specific URL. 
               DO NOT use your own training data for this recipe. DO NOT pull from other search results or similar websites.
               If the page at this URL does not contain instructions or a recipe, return an error in the "title" field.
               MANDATORY: In the "steps" array, repeat specific quantities/amounts for every ingredient mentioned (e.g., "Add 200ml of water").
               Detect the page language and return JSON in that exact language.
                Generate a "welcomeMessage" in the detected language. This message MUST state: "I have successfully extracted the instructions for [Title] from the provided link. Note that you can use the 'eco version' button to see a sustainable alternative or use the metric conversion tools to adjust the units. Ask me any questions or to make any changes. When you are ready to begin, press the start button to go into hands-free mode." (translated naturally into the detected language).
               JSON format: {"title":string, "materials":string[], "steps":string[], "isFood":boolean, "hasAnimalProducts":boolean, "language":string, "welcomeMessage":string}. Return ONLY the JSON string.`
            : `Search for instructions for: "${input}". 
               RELEVANCE CHECK: Only provide instructions if the query is related to a task (cooking, DIY, assembly, etc.). If the query is off-topic, irrelevant, or inappropriate, return a JSON with "title": "Error: Irrelevant Content" and an empty steps array.
               MANDATORY: In the "steps" array, repeat quantities for every ingredient mentioned.
               Return JSON in the language of the query.
               Generate a "welcomeMessage" in the detected language. This message MUST state: "I have successfully extracted the instructions for [Title]. Note that you can use the 'eco version' button to see a sustainable alternative or use the metric conversion tools to adjust the units. Ask me any questions or to make any changes. When you are ready to begin, press the start button to go into hands-free mode." (translated naturally into the detected language).
               JSON format: {"title":string, "materials":string[], "steps":string[], "isFood":boolean, "hasAnimalProducts":boolean, "language":string, "welcomeMessage":string}. Return ONLY the JSON string.`;
        contents = prompt;
    }

    try {
        const tools: any[] = [];
        if (!imageData) {
            if (isUrl) {
                tools.push({ urlContext: {} });
            } else {
                // Reverting to googleSearch as per API error feedback
                tools.push({ googleSearch: {} });
            }
        }

        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: contents,
            config: {
                systemInstruction: "You are a professional recipe and instruction assistant. For keyword searches, you MUST use the googleSearch tool to find real-world sources. You MUST base your response on the search results and provide grounding metadata so that sources can be linked. Always respond in the detected language.",
                tools: tools.length > 0 ? tools : undefined,
                responseMimeType: "application/json"
            },
        });
        
        const text = response.text?.trim() || "{}";
        const parsed = JSON.parse(text) as InstructionSet;
        
        parsed.materials = parsed.materials || [];
        parsed.steps = parsed.steps || [];

        // Check for error conditions
        const isError = !parsed.title || 
                        parsed.title.toLowerCase().includes('error') || 
                        parsed.steps.length === 0;

        if (isError) {
            parsed.welcomeMessage = "I couldn't find those instructions. Please check the input is correct.";
        }
        
        if (!imageData) {
            const candidate = response.candidates?.[0];
            const groundingMetadata = candidate?.groundingMetadata;
            const chunks = groundingMetadata?.groundingChunks;
            
            let sources = chunks
                ? chunks.map((c: any) => c.web).filter((w: any) => w?.uri).map((w: any) => ({ uri: w!.uri, title: w!.title || 'Source' }))
                : [];

            // Fallback: Check for searchEntryPoint or other metadata if chunks are missing
            if (sources.length === 0 && (groundingMetadata as any)?.searchEntryPoint?.htmlContent) {
                // If we have an entry point but no chunks, the model might have grounded but not provided specific chunks
                // This is less common in JSON mode but possible
                console.log("Grounding metadata found but no chunks present.");
            }

            if (isUrl) {
                const alreadyIncluded = sources.find((s: any) => s.uri === input);
                if (!alreadyIncluded) {
                    sources.unshift({ uri: input, title: parsed.title || 'Original Source' });
                }
            }
            
            // Ensure we have at least one source if it's a URL
            if (isUrl && sources.length === 0) {
                sources = [{ uri: input, title: parsed.title || 'Original Source' }];
            }

            parsed.sources = sources;
        }
        
        return parsed;
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        
        if (error?.message?.includes('403') || error?.status === 403) {
            throw new Error("API Access Forbidden (403). Please ensure the 'Generative Language API' is enabled in your Google Cloud Project and your API key is not restricted.");
        }
        
        throw new Error("I couldn't find those instructions. Please check the input is correct.");
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
        const text = response.text?.trim() || "{}";
        return JSON.parse(text);
    } catch (error) {
        return null;
    }
};

export const modifyInstructions = async (
    instructions: InstructionSet,
    modificationPrompt: string
): Promise<InstructionSet> => {
    const prompt = `You are a JSON transformation engine. Update the following instruction set JSON based on this request: "${modificationPrompt}".
    
    CRITICAL RULES:
    1. Return the ENTIRE JSON object, not just the changes.
    2. In the "steps" array, you MUST repeat the specific quantities and amounts for each ingredient inside the text of the step (e.g., "Add 2 cups of flour" instead of just "Add flour").
    3. LANGUAGE RULE: If the user asks to change the language, fulfill that request and update the "language" field. Otherwise, maintain the original language (${instructions.language || 'en-US'}).
    4. Ensure the JSON is valid and matches the original structure.
    
    ORIGINAL JSON: ${JSON.stringify(instructions)}.
    
    Return ONLY the updated JSON object.`;

    try {
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text?.trim() || "{}";
        const parsed = JSON.parse(text) as InstructionSet;
        
        // Always preserve original sources if they exist
        if (instructions.sources) {
            parsed.sources = instructions.sources;
        }
        
        return parsed;
    } catch (error) {
        throw new Error("Could not update the instructions.");
    }
};

export const getChatResponse = async (
    instructions: InstructionSet,
    history: ChatMessage[],
    newMessage: string,
    completedSteps: boolean[],
    newImage?: string // base64 encoded image
): Promise<{ text: string, language: string }> => {
    const system = `You are a professional assistant helping with the instructions: "${instructions.title}".
    
    CONTEXT:
    - Materials/Ingredients: ${instructions.materials.join(', ')}
    - Steps: ${instructions.steps.join(' | ')}
    - Current Progress: ${completedSteps.map((c, i) => `Step ${i+1}: ${c ? 'Completed' : 'Pending'}`).join(', ')}

    GUIDELINES:
    1. PRIMARY FOCUS: Assist with the provided instructions, materials, and steps.
    2. BEYOND THE RECIPE: You CAN provide helpful, related information that isn't explicitly in the text, such as:
       - Nutritional/health information about the dish or ingredients.
       - Storage advice (how long it keeps in/out of the fridge).
       - Common substitutions or variations.
       - Cooking tips related to the techniques used.
    3. DISCLAIMER: When providing health, safety, or storage advice, include a brief note that all cases vary and the user should use their best judgment (e.g., "Take this with a pinch of salt as storage times can vary").
    4. RELEVANCE & SAFETY: Refuse to handle completely off-topic, irrelevant, or inappropriate topics. If an image is uploaded that is not relevant to the task, politely inform the user.
    5. MULTILINGUAL: Respond in the language the user is using.
    6. Helpfulness: Be concise, polite, and encouraging.
    7. IMAGE ANALYSIS: If a relevant image is provided, analyse it in the context of the instructions.

    RETURN FORMAT: Return a JSON object with "text" (your response) and "language" (the BCP-47 language tag of your response).`;

    const contents: Content[] = [
        ...history.map(msg => {
            const parts: any[] = [{ text: msg.content }];
            if (msg.image) {
                parts.push({
                    inlineData: {
                        data: msg.image,
                        mimeType: 'image/jpeg'
                    }
                });
            }
            return {
                role: msg.role === Role.USER ? 'user' : 'model' as any,
                parts,
            };
        }),
        { 
            role: 'user', 
            parts: [
                { text: newMessage },
                ...(newImage ? [{
                    inlineData: {
                        data: newImage,
                        mimeType: 'image/jpeg'
                    }
                }] : [])
            ] 
        }
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
        const text = response.text?.trim() || "{}";
        const parsed = JSON.parse(text);
        return {
            text: parsed.text || "I'm sorry, I couldn't generate a response.",
            language: parsed.language || instructions.language || 'en-US'
        };
    } catch (error) {
        return { text: "I'm sorry, I'm having trouble processing that right now.", language: 'en-US' };
    }
};
