
export interface InstructionSet {
    title: string;
    materials: string[];
    steps: string[];
    sources?: { uri: string; title: string; }[];
    sustainabilitySuggestion?: string;
    isFood?: boolean;
    hasAnimalProducts?: boolean;
    language?: string;
    cookingTime?: string;
    ovenTemp?: string;
    expiryDate?: string;
    welcomeMessage?: string;
}

export enum Role {
    USER = 'user',
    ASSISTANT = 'assistant'
}

export interface ChatMessage {
    role: Role;
    content: string;
    language?: string; // BCP-47 tag for this specific message
}
