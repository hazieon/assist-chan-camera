
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import ChatMessage from './ChatMessage';
import { MicIcon } from './icons/MicIcon';
import { SendIcon } from './icons/SendIcon';

interface ChatInterfaceProps {
    chatHistory: ChatMessageType[];
    onSendMessage: (message: string) => void;
    isAnswering: boolean;
    isCookingMode: boolean;
    isContinuousListening: boolean;
    onToggleListening: () => void;
    isMuted: boolean;
    speakingMessageIndex: number | null;
    onToggleMessageSpeech: (index: number, text: string, lang?: string) => void;
    pendingMod: { summary: string } | null;
    onConfirmMod: () => void;
    onCancelMod: () => void;
    targetLang?: string;
    suggestions?: string[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    chatHistory, 
    onSendMessage, 
    isAnswering, 
    isCookingMode,
    isContinuousListening, 
    onToggleListening, 
    isMuted, 
    speakingMessageIndex,
    onToggleMessageSpeech,
    pendingMod,
    onConfirmMod,
    onCancelMod,
    targetLang = 'en-US',
    suggestions = []
}) => {
    const [message, setMessage] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !isAnswering) {
            onSendMessage(message);
            setMessage('');
        }
    };

    return (
        <div className="flex flex-col h-[40vh] md:h-[50vh] min-h-[300px]">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex flex-col">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary uppercase tracking-tighter flex items-center gap-3">
                        <span className="text-accent">CHAT</span> ASSISTANT
                    </h3>
                    <p className="text-xs sm:text-sm text-text-secondary mt-1">Ask for adjustments, dietary swaps, or scaling</p>
                </div>
                <div className="flex gap-1">
                    <div className={`w-2 h-2 rounded-full ${isContinuousListening ? 'bg-error animate-pulse' : 'bg-gray-600'}`} />
                    <div className={`w-2 h-2 rounded-full ${isAnswering ? 'bg-accent animate-bounce' : 'bg-gray-600'}`} />
                </div>
            </div>
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto mb-4 p-3 bg-secondary rounded-xl space-y-4 scroll-smooth border border-gray-300 dark:border-transparent shadow-inner">
                {chatHistory.map((msg, index) => (
                    <ChatMessage 
                        key={index} 
                        message={msg} 
                        isMuted={isMuted} 
                        isSpeaking={speakingMessageIndex === index}
                        onToggleSpeech={(text, lang) => onToggleMessageSpeech(index, text, lang)} 
                    />
                ))}
                {pendingMod && (
                    <div className="flex flex-col gap-3 p-4 bg-accent/10 border border-accent/40 rounded-xl animate-fade-in shadow-lg">
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                             <p className="text-xs font-bold text-accent uppercase tracking-wider">Confirm Modification</p>
                        </div>
                        <p className="text-sm font-medium italic text-text-primary">"{pendingMod.summary}"</p>
                        <div className="flex gap-2">
                            <button onClick={onConfirmMod} className="flex-1 bg-accent text-white py-2 px-4 rounded-lg font-bold hover:bg-accent/90 transition-all text-sm shadow-md">
                                Confirm
                            </button>
                            <button onClick={onCancelMod} className="flex-1 bg-secondary text-text-primary py-2 px-4 rounded-lg font-bold hover:bg-secondary/80 transition-all text-sm border border-gray-300 dark:border-gray-600">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
                {isAnswering && (
                    <div className="flex items-center space-x-2 p-2 opacity-50">
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-.3s]"></div>
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-.5s]"></div>
                    </div>
                )}
            </div>
            
            <div className="flex flex-col gap-4">
                {suggestions.length > 0 && !isCookingMode && (
                    <div className="flex flex-wrap gap-2 mb-1">
                        {suggestions.map((suggestion, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    if (!isAnswering && !pendingMod) {
                                        onSendMessage(suggestion);
                                    }
                                }}
                                className="bg-accent text-white hover:bg-white hover:text-accent text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-accent transition-all active:scale-95 whitespace-nowrap shadow-sm"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={isCookingMode ? "Chat disabled in Cooking Mode" : (isContinuousListening ? "Listening..." : "e.g. Make it gluten free...")}
                        className={`flex-grow p-5 pr-24 bg-primary rounded-full border-2 border-gray-300 dark:border-gray-600 focus:ring-4 focus:ring-accent/30 focus:outline-none transition-all text-lg text-text-primary shadow-xl ${isCookingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isAnswering || !!pendingMod || isCookingMode}
                        enterKeyHint="send"
                    />
                    <div className="absolute right-4 flex items-center gap-1">
                        <button 
                            type="button"
                            onClick={onToggleListening}
                            title={isCookingMode ? "Voice commands only" : "Voice Input"}
                            className={`p-2 rounded-full transition-all ${isContinuousListening ? 'bg-error text-white' : 'text-accent hover:bg-gray-800'} ${isCookingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={isAnswering || !!pendingMod || isCookingMode}
                        >
                            <MicIcon className="w-6 h-6" />
                        </button>
                        <button 
                            type="submit" 
                            title="Send Message"
                            className="p-2 bg-accent rounded-full hover:bg-accent/90 transition-all shadow-lg text-white disabled:opacity-30" 
                            disabled={!message.trim() || isAnswering || !!pendingMod || isCookingMode}
                        >
                            <SendIcon className="w-6 h-6" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
