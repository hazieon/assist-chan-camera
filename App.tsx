
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { InstructionSet, ChatMessage as ChatMessageType, Role } from './types';
import { getInstructions, getChatResponse, modifyInstructions, detectModificationIntent } from './services/geminiService';
import UrlInputForm from './components/UrlInputForm';
import ChatInterface from './components/ChatInterface';
import InstructionDisplay from './components/RecipeDisplay';
import ActionButtons from './components/ActionButtons';
import { BotIcon } from './components/icons/BotIcon';
import { SpeakerIcon } from './components/icons/SpeakerIcon';
import { SpeakerMuteIcon } from './components/icons/SpeakerMuteIcon';
import { MicIcon } from './components/icons/MicIcon';

const App: React.FC = () => {
    const [instructionSet, setInstructionSet] = useState<InstructionSet | null>(null);
    const [originalInstructionSet, setOriginalInstructionSet] = useState<InstructionSet | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAnswering, setIsAnswering] = useState<boolean>(false);
    const [isModifying, setIsModifying] = useState<boolean>(false);
    const [isEcoApplied, setIsEcoApplied] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessageType[]>([]);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
    const [isContinuousListening, setIsContinuousListening] = useState<boolean>(false);
    const [isReadingInstructions, setIsReadingInstructions] = useState<boolean>(false);
    const [isReadingMaterials, setIsReadingMaterials] = useState<boolean>(false);
    const [hasPrimed, setHasPrimed] = useState(false);
    const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
    const [pendingMod, setPendingMod] = useState<{ prompt: string; summary: string } | null>(null);
    
    const isMutedRef = useRef(isMuted);
    isMutedRef.current = isMuted;

    const stopReadingRef = useRef(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const getLangTag = useCallback((lang: string | undefined): string => {
        if (!lang) return 'en-US';
        const clean = lang.toLowerCase().trim();
        
        if (/^en|english/.test(clean)) return 'en-US';
        if (/^es|spanish|español/.test(clean)) return 'es-ES';
        if (/^fr|french|français/.test(clean)) return 'fr-FR';
        if (/^it|italian|italiano/.test(clean)) return 'it-IT';
        if (/^pt|portuguese|português/.test(clean)) return 'pt-BR';
        if (/^de|german|deutsch/.test(clean)) return 'de-DE';
        if (/^zh|chinese/.test(clean)) return 'zh-CN';
        if (/^ja|japanese/.test(clean)) return 'ja-JP';
        if (/^ko|korean/.test(clean)) return 'ko-KR';
        if (/^ru|russian/.test(clean)) return 'ru-RU';
        if (/^nl|dutch/.test(clean)) return 'nl-NL';
        
        return clean.replace('_', '-');
    }, []);

    const primeSpeech = useCallback(() => {
        if (hasPrimed || !window.speechSynthesis) return;
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
        setHasPrimed(true);
    }, [hasPrimed]);

    const speak = useCallback((text: string, onEnd?: () => void, langOverride?: string) => {
        if (!window.speechSynthesis || isMutedRef.current) {
            onEnd?.();
            return;
        }
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ''));
        utterance.rate = 1.0;
        
        const targetLangTag = langOverride || (instructionSet?.language ? getLangTag(instructionSet.language) : 'en-US');
        utterance.lang = targetLangTag;
        
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const exactMatch = voices.find(v => v.lang.toLowerCase() === targetLangTag.toLowerCase());
            const prefixMatch = voices.find(v => v.lang.toLowerCase().startsWith(targetLangTag.split('-')[0].toLowerCase()));
            utterance.voice = exactMatch || prefixMatch || voices[0];
        }
        
        utteranceRef.current = utterance;
        utterance.onend = () => {
            utteranceRef.current = null;
            onEnd?.();
        };
        utterance.onerror = () => {
            utteranceRef.current = null;
            onEnd?.();
        };

        window.speechSynthesis.speak(utterance);
    }, [instructionSet, getLangTag]);

    const toggleMessageSpeech = useCallback((index: number, text: string, lang?: string) => {
        if (speakingMessageIndex === index) {
            window.speechSynthesis.cancel();
            setSpeakingMessageIndex(null);
        } else {
            setSpeakingMessageIndex(index);
            speak(text, () => setSpeakingMessageIndex(null), lang);
        }
    }, [speakingMessageIndex, speak]);

    const handleFetchInstructions = useCallback(async (input: string, imageData?: { data: string, mimeType: string }) => {
        if (!input && !imageData) return;
        primeSpeech();
        setIsLoading(true);
        setError(null);
        setChatHistory([]);
        setIsReadingInstructions(false);
        setIsReadingMaterials(false);
        setIsEcoApplied(false);
        setOriginalInstructionSet(null);
        setPendingMod(null);
        stopReadingRef.current = true;
        setSpeakingMessageIndex(null);

        try {
            const data = await getInstructions(input, imageData);
            setInstructionSet(data);
            setCompletedSteps(new Array((data.steps || []).length).fill(false));
            
            const lang = getLangTag(data.language);
            const welcomeMsg = data.welcomeMessage || `I have successfully extracted the instructions for "${data.title}". Note that you can use the 'eco version' button to see a sustainable alternative or use the metric conversion tools to adjust the units. How can I help you today?`;
            
            setChatHistory([{ role: Role.ASSISTANT, content: welcomeMsg, language: lang }]);
            speak(welcomeMsg, undefined, lang);
        } catch (e: any) {
            setError(e.message || "Error finding instructions.");
        } finally {
            setIsLoading(false);
        }
    }, [speak, primeSpeech, getLangTag]);

    const handleReadInstructions = useCallback(() => {
        if (!instructionSet || isMuted || !window.speechSynthesis) return;
        
        stopReadingRef.current = false;
        setIsReadingInstructions(true);
        setIsReadingMaterials(false);
        setSpeakingMessageIndex(null);
        
        const lang = getLangTag(instructionSet.language);
        
        const readStep = (index: number) => {
            if (stopReadingRef.current || index >= instructionSet.steps.length) {
                setIsReadingInstructions(false);
                return;
            }

            if (completedSteps[index]) {
                readStep(index + 1);
                return;
            }

            const text = instructionSet.steps[index];
            speak(text, () => {
                if (!stopReadingRef.current) {
                    setTimeout(() => readStep(index + 1), 600);
                }
            }, lang);
        };

        readStep(0);
    }, [instructionSet, completedSteps, isMuted, speak, getLangTag]);

    const handleReadMaterials = useCallback(() => {
        if (!instructionSet || isMuted || !window.speechSynthesis) return;
        
        stopReadingRef.current = false;
        setIsReadingMaterials(true);
        setIsReadingInstructions(false);
        setSpeakingMessageIndex(null);
        
        const lang = getLangTag(instructionSet.language);
        
        const readMaterial = (index: number) => {
            if (stopReadingRef.current || index >= instructionSet.materials.length) {
                setIsReadingMaterials(false);
                return;
            }

            const text = instructionSet.materials[index];
            speak(text, () => {
                if (!stopReadingRef.current) {
                    setTimeout(() => readMaterial(index + 1), 600);
                }
            }, lang);
        };

        readMaterial(0);
    }, [instructionSet, isMuted, speak, getLangTag]);

    const handleStopReading = useCallback(() => {
        stopReadingRef.current = true;
        window.speechSynthesis.cancel();
        setIsReadingInstructions(false);
        setIsReadingMaterials(false);
    }, []);

    const handleModifyInstructions = useCallback(async (prompt: string, isEcoSwitch: boolean = false) => {
        if (!instructionSet) return;
        primeSpeech();
        setIsModifying(true);
        handleStopReading();
        setPendingMod(null);

        try {
            if (isEcoSwitch && !originalInstructionSet) {
                setOriginalInstructionSet(JSON.parse(JSON.stringify(instructionSet)));
            }

            const updated = await modifyInstructions(instructionSet, prompt);
            if (isEcoSwitch) {
                setIsEcoApplied(true);
                updated.hasAnimalProducts = false;
            }

            setInstructionSet(updated);
            setCompletedSteps(new Array((updated.steps || []).length).fill(false));
            
            const lang = getLangTag(updated.language);
            setChatHistory(prev => [...prev, { role: Role.ASSISTANT, content: "Instructions updated successfully.", language: lang }]);
            speak("Updated.", undefined, lang);
        } catch (e) {
            setError("Update failed.");
        } finally {
            setIsModifying(false);
        }
    }, [instructionSet, originalInstructionSet, speak, primeSpeech, handleStopReading, getLangTag]);

    const handleConfirmModification = useCallback(() => {
        if (pendingMod) handleModifyInstructions(pendingMod.prompt, pendingMod.prompt.includes("VEGAN"));
    }, [pendingMod, handleModifyInstructions]);

    const handleCancelModification = useCallback(() => {
        setPendingMod(null);
        setChatHistory(prev => [...prev, { role: Role.ASSISTANT, content: "Modification cancelled." }]);
        speak("Cancelled.");
    }, [speak]);

    const requestModification = useCallback((prompt: string, summary: string) => {
        setPendingMod({ prompt, summary });
        setChatHistory(prev => [...prev, { role: Role.ASSISTANT, content: `Confirm modification: ${summary}?` }]);
        speak("Confirm changes?");
    }, [speak]);

    const handleRevertInstructions = useCallback(() => {
        if (!originalInstructionSet) return;
        handleStopReading();
        setInstructionSet(JSON.parse(JSON.stringify(originalInstructionSet)));
        setCompletedSteps(new Array(originalInstructionSet.steps.length).fill(false));
        setIsEcoApplied(false);
        setOriginalInstructionSet(null);
        
        const lang = getLangTag(originalInstructionSet.language);
        speak("Reverted to original.", undefined, lang);
    }, [originalInstructionSet, handleStopReading, speak, getLangTag]);

    const handleSendMessage = useCallback(async (message: string) => {
        if (!instructionSet || isAnswering) return;
        primeSpeech();
        setIsAnswering(true);
        handleStopReading();
        setChatHistory(prev => [...prev, { role: Role.USER, content: message }]);

        try {
            const intent = await detectModificationIntent(message, instructionSet.language);
            
            if (intent?.type === 'MODIFICATION') {
                setIsAnswering(false);
                requestModification(message, intent.summary);
            } else {
                const aiResult = await getChatResponse(instructionSet, chatHistory, message, completedSteps);
                const lang = getLangTag(aiResult.language);
                
                setChatHistory(prev => [...prev, { 
                    role: Role.ASSISTANT, 
                    content: aiResult.text, 
                    language: lang 
                }]);
                
                speak(aiResult.text, undefined, lang);
                setIsAnswering(false);
            }
        } catch (e) {
            setIsAnswering(false);
            console.error(e);
        }
    }, [instructionSet, isAnswering, speak, chatHistory, completedSteps, primeSpeech, handleStopReading, requestModification, getLangTag]);

    return (
        <div className="min-h-screen bg-primary text-text-primary font-sans flex flex-col" onClick={primeSpeech} onTouchStart={primeSpeech}>
            <header className="bg-secondary p-3 shadow-md sticky top-0 z-20 border-b border-gray-800">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BotIcon className="w-5 h-5 text-accent" />
                        <h1 className="text-md md:text-lg font-bold tracking-tight text-white">Chef AI Assistant</h1>
                        {instructionSet?.language && (
                            <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded border border-accent/30 ml-2 font-mono uppercase">
                                {instructionSet.language}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => setIsContinuousListening(prev => !prev)} className={`p-2 rounded-full transition-all ${isContinuousListening ? 'bg-red-600 scale-110 shadow-lg' : 'bg-primary/50 hover:bg-primary'}`}>
                            <MicIcon className="w-5 h-5 text-white" />
                        </button>
                        <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full bg-primary/50 hover:bg-primary">
                            {isMuted ? <SpeakerMuteIcon className="w-5 h-5 text-gray-500" /> : <SpeakerIcon className="w-5 h-5 text-accent" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto p-4 flex flex-col gap-4 max-w-4xl">
                <UrlInputForm onFetch={handleFetchInstructions} isLoading={isLoading || isModifying} />
                
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4 bg-secondary/30 rounded-xl border border-gray-800">
                        <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full"></div>
                        <p className="text-accent animate-pulse font-bold tracking-wide">SCRAPING SOURCE...</p>
                    </div>
                )}
                
                {instructionSet && !isLoading && (
                    <div className="animate-fade-in flex flex-col gap-4">
                        <InstructionDisplay 
                            instructionSet={instructionSet}
                            completedSteps={completedSteps}
                            onToggleStep={(i) => {
                                const next = [...completedSteps];
                                next[i] = !next[i];
                                setCompletedSteps(next);
                            }}
                            onReadInstructions={handleReadInstructions}
                            onReadMaterials={handleReadMaterials}
                            onStopReading={handleStopReading}
                            isReadingInstructions={isReadingInstructions}
                            isReadingMaterials={isReadingMaterials}
                            isMuted={isMuted}
                            onEcoSwitch={() => requestModification("Regenerate as a sustainable VEGAN version.", "Vegan conversion")}
                            onRevert={handleRevertInstructions}
                            isModifying={isModifying}
                            isEcoApplied={isEcoApplied}
                        />
                        <ActionButtons onModify={requestModification} disabled={isLoading || isAnswering || isModifying} />
                    </div>
                )}
                
                {chatHistory.length > 0 && !isLoading && (
                    <div className="bg-secondary p-4 rounded-xl shadow-inner border border-gray-800">
                        <ChatInterface
                            chatHistory={chatHistory}
                            onSendMessage={handleSendMessage}
                            isAnswering={isAnswering || isModifying}
                            isContinuousListening={isContinuousListening}
                            onToggleListening={() => setIsContinuousListening(!isContinuousListening)}
                            isMuted={isMuted}
                            speakingMessageIndex={speakingMessageIndex}
                            onToggleMessageSpeech={toggleMessageSpeech}
                            pendingMod={pendingMod}
                            onConfirmMod={handleConfirmModification}
                            onCancelMod={handleCancelModification}
                            targetLang={instructionSet?.language}
                        />
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
