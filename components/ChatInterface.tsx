
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
    targetLang = 'en-US'
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
            <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm font-bold text-accent uppercase tracking-widest">Personal Assistant</h3>
                <div className="flex gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${isContinuousListening ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full ${isAnswering ? 'bg-accent animate-bounce' : 'bg-gray-600'}`} />
                </div>
            </div>
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto mb-4 p-3 bg-primary/40 rounded-xl space-y-4 scroll-smooth border border-border-base/50">
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
                            <button onClick={onConfirmMod} className="flex-1 bg-accent text-white py-2 px-4 rounded-lg font-bold hover:bg-indigo-500 transition-all text-sm shadow-md">
                                Confirm
                            </button>
                            <button onClick={onCancelMod} className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg font-bold hover:bg-gray-600 transition-all text-sm">
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
            
            <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={isCookingMode ? "Chat disabled in Cooking Mode" : (isContinuousListening ? "Listening..." : "Speak to the assistant...")}
                    className={`flex-grow p-3 pr-24 bg-primary border border-border-base rounded-lg focus:ring-2 focus:ring-accent focus:outline-none transition-all text-sm text-text-primary ${isCookingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isAnswering || !!pendingMod || isCookingMode}
                />
                <div className="absolute right-2 flex items-center gap-1">
                    <button 
                        type="button"
                        onClick={onToggleListening}
                        title={isCookingMode ? "Voice commands only" : "Voice Input"}
                        className={`p-2 rounded-lg transition-all ${isContinuousListening ? 'bg-red-600 text-white' : 'text-accent hover:bg-gray-800'} ${isCookingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isAnswering || !!pendingMod || isCookingMode}
                    >
                        <MicIcon className="w-5 h-5" />
                    </button>
                    <button 
                        type="submit" 
                        title="Send Message"
                        className="p-2 bg-accent rounded-lg hover:bg-indigo-500 transition-all shadow-lg text-white disabled:opacity-30" 
                        disabled={!message.trim() || isAnswering || !!pendingMod || isCookingMode}
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatInterface;
