
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import ChatMessage from './ChatMessage';
import { MicIcon } from './icons/MicIcon';
import { SendIcon } from './icons/SendIcon';

// Types for Web Speech API
declare global {
    interface SpeechRecognition extends EventTarget {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        start(): void;
        stop(): void;
        abort(): void;
        onstart: () => void;
        onresult: (event: SpeechRecognitionEvent) => void;
        onerror: (event: SpeechRecognitionErrorEvent) => void;
        onend: () => void;
    }

    interface SpeechRecognitionEvent extends Event {
        resultIndex: number;
        results: SpeechRecognitionResultList;
    }

    interface SpeechRecognitionResultList {
        [index: number]: SpeechRecognitionResult;
        readonly length: number;
    }

    interface SpeechRecognitionResult {
        [index: number]: SpeechRecognitionAlternative;
        readonly isFinal: boolean;
        readonly length: number;
    }

    interface SpeechRecognitionAlternative {
        readonly transcript: string;
        readonly confidence: number;
    }

    interface SpeechRecognitionErrorEvent extends Event {
        error: string;
    }

    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

interface ChatInterfaceProps {
    chatHistory: ChatMessageType[];
    onSendMessage: (message: string) => void;
    isAnswering: boolean;
    isContinuousListening: boolean;
    onToggleListening: () => void;
    isMuted: boolean;
    speakingMessageIndex: number | null;
    onToggleMessageSpeech: (index: number, text: string) => void;
    pendingMod: { summary: string } | null;
    onConfirmMod: () => void;
    onCancelMod: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    chatHistory, 
    onSendMessage, 
    isAnswering, 
    isContinuousListening, 
    onToggleListening, 
    isMuted, 
    speakingMessageIndex,
    onToggleMessageSpeech,
    pendingMod,
    onConfirmMod,
    onCancelMod
}) => {
    const [message, setMessage] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    const isListeningRef = useRef(false);
    const isStartingRef = useRef(false);
    const isContinuousListeningRef = useRef(isContinuousListening);

    isContinuousListeningRef.current = isContinuousListening;

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);
    
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListeningRef.current = true;
            isStartingRef.current = false;
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript.trim()) {
                onSendMessage(finalTranscript.trim());
            }
        };

        recognition.onerror = (event) => {
            if (event.error !== 'aborted') {
                console.warn('Speech Recognition Error:', event.error);
            }
            if (event.error === 'not-allowed') {
                onToggleListening();
            }
            isListeningRef.current = false;
            isStartingRef.current = false;
        };
        
        recognition.onend = () => {
            isListeningRef.current = false;
            isStartingRef.current = false;
            
            if (isContinuousListeningRef.current) {
                setTimeout(() => {
                    if (isContinuousListeningRef.current && !isListeningRef.current && !isStartingRef.current) {
                        try {
                            isStartingRef.current = true;
                            recognition.start();
                        } catch (e) {
                            isStartingRef.current = false;
                        }
                    }
                }, 200);
            }
        };
        
        return () => {
            isContinuousListeningRef.current = false;
            recognition.onend = null;
            try {
                recognition.abort();
            } catch (e) {}
        };
    }, [onSendMessage, onToggleListening]);
    
    useEffect(() => {
        if (isContinuousListening) {
            if (!isListeningRef.current && !isStartingRef.current) {
                try {
                    isStartingRef.current = true;
                    recognitionRef.current?.start();
                } catch (e) {
                    isStartingRef.current = false;
                }
            }
        } else {
            if (isListeningRef.current || isStartingRef.current) {
                try {
                    recognitionRef.current?.stop();
                } catch (e) {}
            }
        }
    }, [isContinuousListening]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !isAnswering) {
            onSendMessage(message);
            setMessage('');
        }
    };

    return (
        <div className="flex flex-col h-[40vh] md:h-[50vh] min-h-[300px]">
            <div 
                ref={chatContainerRef} 
                className="flex-grow overflow-y-auto mb-4 p-3 bg-primary rounded-lg space-y-4 scroll-smooth"
            >
                {chatHistory.map((msg, index) => (
                    <ChatMessage 
                        key={index} 
                        message={msg} 
                        isMuted={isMuted} 
                        isSpeaking={speakingMessageIndex === index}
                        onToggleSpeech={() => onToggleMessageSpeech(index, msg.content)} 
                    />
                ))}
                {pendingMod && (
                    <div className="flex flex-col gap-3 p-3 bg-accent/10 border border-accent/20 rounded-lg animate-fade-in">
                        <p className="text-xs font-bold text-accent uppercase tracking-wider">Confirmation Required</p>
                        <div className="flex gap-2">
                            <button
                                onClick={onConfirmMod}
                                className="flex-1 bg-accent text-white py-2 px-4 rounded-lg font-bold hover:bg-indigo-500 transition-all active:scale-95 text-sm"
                            >
                                Yes, rerender
                            </button>
                            <button
                                onClick={onCancelMod}
                                className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg font-bold hover:bg-gray-600 transition-all active:scale-95 text-sm"
                            >
                                No, cancel
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
            
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={isContinuousListening ? "I'm listening..." : "Ask for changes or details..."}
                        className="w-full p-3 pr-10 bg-primary border border-gray-700 rounded-lg focus:ring-2 focus:ring-accent focus:outline-none transition-all text-sm"
                        disabled={isAnswering || !!pendingMod}
                    />
                </div>
                <button
                    type="button"
                    onClick={onToggleListening}
                    className={`p-3 rounded-lg transition-all active:scale-95 shadow-inner ${
                        isContinuousListening ? 'bg-red-600' : 'bg-secondary hover:bg-gray-700'
                    }`}
                    disabled={isAnswering || !!pendingMod}
                    aria-label="Toggle voice input"
                >
                    <MicIcon className={`w-5 h-5 ${isContinuousListening ? 'text-white' : 'text-accent'}`} />
                </button>
                <button
                    type="submit"
                    className="p-3 bg-accent rounded-lg hover:bg-indigo-500 transition-all active:scale-95 disabled:bg-gray-700 disabled:opacity-50 shadow-lg"
                    disabled={!message.trim() || isAnswering || !!pendingMod}
                >
                    <SendIcon className="w-5 h-5 text-white" />
                </button>
            </form>
        </div>
    );
};

export default ChatInterface;
