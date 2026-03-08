
import React from 'react';
import { ChatMessage as ChatMessageType, Role } from '../types';
import { BotIcon } from './icons/BotIcon';
import { UserIcon } from './icons/UserIcon';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { StopIcon } from './icons/StopIcon';


const ChatMessage: React.FC<{ 
    message: ChatMessageType; 
    isMuted: boolean; 
    isSpeaking: boolean;
    onToggleSpeech: (text: string, lang?: string) => void; 
}> = ({ message, isMuted, isSpeaking, onToggleSpeech }) => {
    const isAssistant = message.role === Role.ASSISTANT;

    return (
        <div className={`flex items-start gap-3 md:gap-4 ${isAssistant ? '' : 'justify-end'}`}>
            {isAssistant && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-md">
                    <BotIcon className="w-5 h-5 text-white" />
                </div>
            )}
            
            <div className={`relative max-w-[85%] md:max-w-lg p-3 md:p-4 rounded-2xl shadow-sm transition-all group ${
                isAssistant ? 'bg-secondary rounded-tl-none' : 'bg-accent rounded-tr-none'
            }`}>
                <p className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{message.content}</p>
                 {isAssistant && (
                    <div className="flex items-center gap-3 mt-2">
                        <button 
                            onClick={() => onToggleSpeech(message.content, message.language)} 
                            className={`flex items-center gap-1.5 text-xs font-medium transition-all ${
                                isSpeaking ? 'text-red-400' : 'text-text-secondary hover:text-accent'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
                            disabled={isMuted}
                        >
                            {isSpeaking ? (
                                <>
                                    <StopIcon className="w-4 h-4 animate-pulse" />
                                    <span>Stop Reading</span>
                                </>
                            ) : (
                                <>
                                    <SpeakerIcon className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                                    <span>Read Aloud</span>
                                </>
                            )}
                        </button>
                        {message.language && (
                            <span className="text-[9px] uppercase font-mono opacity-40 bg-primary px-1 rounded">
                                {message.language}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {!isAssistant && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shadow-md">
                    <UserIcon className="w-5 h-5 text-white" />
                </div>
            )}
        </div>
    );
};

export default ChatMessage;
