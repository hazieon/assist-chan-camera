
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import ChatMessage from './ChatMessage';
import { MicIcon } from './icons/MicIcon';
import { SendIcon } from './icons/SendIcon';
import { CameraPlusIcon } from './icons/CameraPlusIcon';
import { StopIcon } from './icons/StopIcon';

interface ChatInterfaceProps {
    chatHistory: ChatMessageType[];
    onSendMessage: (message: string, image?: string) => void;
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
    const [image, setImage] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);
    
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                setImage(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((message.trim() || image) && !isAnswering) {
            onSendMessage(message, image || undefined);
            setMessage('');
            setImage(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col h-[65vh] md:h-[50vh] min-h-[400px]">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex flex-col">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary uppercase tracking-tighter flex items-center gap-3">
                        <span className="text-accent">CHAT</span> ASSISTANT
                    </h3>
                    <p className="text-xs sm:text-sm text-text-secondary mt-1">Ask for adjustments, dietary swaps, or other questions</p>
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
                    <div className="flex overflow-x-auto no-scrollbar gap-2 mb-1 pb-2 w-full max-w-full">
                        {suggestions.map((suggestion, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    if (!isAnswering && !pendingMod) {
                                        onSendMessage(suggestion);
                                    }
                                }}
                                className="bg-accent text-white hover:bg-white hover:text-accent text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-accent transition-all active:scale-95 whitespace-nowrap shadow-sm flex-shrink-0"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    {image && (
                        <div className="relative w-24 h-24 mb-1 group">
                            <img 
                                src={`data:image/jpeg;base64,${image}`} 
                                alt="Preview" 
                                className="w-full h-full object-cover rounded-xl border-2 border-accent shadow-lg"
                            />
                            <button 
                                type="button"
                                onClick={removeImage}
                                className="absolute -top-2 -right-2 bg-error text-white p-1.5 rounded-full shadow-xl hover:scale-110 transition-all z-10"
                            >
                                <StopIcon className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    
                    <div className="bg-primary rounded-2xl border-2 border-gray-300 dark:border-gray-600 focus-within:ring-4 focus-within:ring-accent/30 transition-all shadow-2xl overflow-hidden">
                        <textarea
                            rows={1}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e as any);
                                }
                            }}
                            placeholder={isCookingMode ? "Chat disabled" : (isContinuousListening ? "Listening..." : "Ask a question...")}
                            className="w-full bg-transparent border-none focus:ring-0 text-base md:text-lg text-text-primary py-4 px-5 resize-none min-h-[60px] max-h-32"
                            disabled={isAnswering || !!pendingMod || isCookingMode}
                        />
                        
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/30 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-1">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Add Photo"
                                    className="p-3 text-accent hover:bg-accent/10 rounded-xl transition-all active:scale-95"
                                    disabled={isAnswering || !!pendingMod || isCookingMode}
                                >
                                    <CameraPlusIcon className="w-6 h-6" />
                                </button>
                                <button 
                                    type="button"
                                    onClick={onToggleListening}
                                    title="Voice Input"
                                    className={`p-3 rounded-xl transition-all active:scale-95 ${isContinuousListening ? 'bg-error text-white shadow-md' : 'text-accent hover:bg-accent/10'}`}
                                    disabled={isAnswering || !!pendingMod || isCookingMode}
                                >
                                    <MicIcon className="w-6 h-6" />
                                </button>
                            </div>
                            
                            <button 
                                type="submit" 
                                className="flex items-center gap-2 px-5 py-2.5 bg-accent rounded-xl hover:bg-accent/90 transition-all shadow-lg text-white font-black uppercase tracking-wider text-xs sm:text-sm disabled:opacity-30 active:scale-95" 
                                disabled={(!message.trim() && !image) || isAnswering || !!pendingMod || isCookingMode}
                            >
                                <span className="hidden sm:inline">Send</span>
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
