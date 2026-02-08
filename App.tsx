
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { InstructionSet, ChatMessage as ChatMessageType, Role } from './types';
import { getInstructions, getSustainableSuggestion, getChatResponse, modifyInstructions, detectModificationIntent } from './services/geminiService';
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
    const [hasPrimed, setHasPrimed] = useState(false);
    const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
    const [pendingMod, setPendingMod] = useState<{ prompt: string; summary: string } | null>(null);
    
    const isMutedRef = useRef(isMuted);
    isMutedRef.current = isMuted;

    const stopReadingRef = useRef(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const primeSpeech = useCallback(() => {
        if (hasPrimed || !window.speechSynthesis) return;
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
        setHasPrimed(true);
    }, [hasPrimed]);

    const speak = useCallback((text: string, onEnd?: () => void) => {
        if (!window.speechSynthesis || isMutedRef.current) {
            onEnd?.();
            return;
        }
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ''));
        utterance.rate = 1.05;
        
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
    }, []);

    const toggleMessageSpeech = useCallback((index: number, text: string) => {
        if (speakingMessageIndex === index) {
            window.speechSynthesis.cancel();
            setSpeakingMessageIndex(null);
        } else {
            setSpeakingMessageIndex(index);
            stopReadingRef.current = false;
            speak(text, () => setSpeakingMessageIndex(null));
        }
    }, [speakingMessageIndex, speak]);

    const handleFetchInstructions = useCallback(async (input: string, imageData?: { data: string, mimeType: string }) => {
        if (!input && !imageData) return;
        primeSpeech();
        setIsLoading(true);
        setError(null);
        setChatHistory([]);
        setIsReadingInstructions(false);
        setIsEcoApplied(false);
        setOriginalInstructionSet(null);
        setPendingMod(null);
        stopReadingRef.current = true;
        setSpeakingMessageIndex(null);

        try {
            const data = await getInstructions(input, imageData);
            const materials = data.materials || [];
            data.materials = materials;

            const animalKeywords = ['meat', 'chicken', 'beef', 'pork', 'lamb', 'fish', 'egg', 'milk', 'dairy', 'cream', 'butter', 'honey', 'shrimp', 'steak', 'bacon', 'ham'];
            const foundKeyword = materials.some(m => animalKeywords.some(k => m.toLowerCase().includes(k)));
            
            if (foundKeyword) data.hasAnimalProducts = true;

            let showEcoInfo = false;
            if (data.isFood) {
                if (data.hasAnimalProducts && materials.length > 0) {
                    const sug = await getSustainableSuggestion(data.title, materials);
                    if (sug) data.sustainabilitySuggestion = sug;
                    setIsEcoApplied(false);
                    showEcoInfo = true;
                } else if (!data.hasAnimalProducts && materials.length > 0) {
                    setIsEcoApplied(true);
                }
            }

            setInstructionSet(data);
            setCompletedSteps(new Array((data.steps || []).length).fill(false));
            
            const msg = `Loaded ${data.title}.`;
            setChatHistory([{ role: Role.ASSISTANT, content: msg }]);

            let welcomeSpeech = `here is the instructions for ${data.title}.`;
            if (materials.length > 0) {
                welcomeSpeech += ` You can convert the units, scale the materials`;
                if (showEcoInfo) {
                    welcomeSpeech += `, or generate a sustainable version by clicking the green eco button`;
                }
            }
            welcomeSpeech += `. Enjoy.`;
            
            speak(welcomeSpeech);
        } catch (e: any) {
            console.error("Fetch error:", e);
            setError(e.message || "Error finding instructions.");
        } finally {
            setIsLoading(false);
        }
    }, [speak, primeSpeech]);

    const handleReadInstructions = useCallback(() => {
        if (!instructionSet || isMuted || !window.speechSynthesis) return;
        
        stopReadingRef.current = false;
        setIsReadingInstructions(true);
        setSpeakingMessageIndex(null);
        
        const readStep = (index: number) => {
            if (stopReadingRef.current || index >= instructionSet.steps.length) {
                setIsReadingInstructions(false);
                if (index >= instructionSet.steps.length && !stopReadingRef.current) {
                    speak("Instructions complete.");
                }
                return;
            }

            if (completedSteps[index]) {
                readStep(index + 1);
                return;
            }

            const text = `Step ${index + 1}. ${instructionSet.steps[index]}`;
            speak(text, () => {
                if (!stopReadingRef.current) {
                    setTimeout(() => readStep(index + 1), 600);
                }
            });
        };

        readStep(0);
    }, [instructionSet, completedSteps, isMuted, speak]);

    const handleStopReading = useCallback(() => {
        stopReadingRef.current = true;
        window.speechSynthesis.cancel();
        setIsReadingInstructions(false);
        setSpeakingMessageIndex(null);
    }, []);

    const handleModifyInstructions = useCallback(async (prompt: string, isEcoSwitch: boolean = false, customChatMsg?: string) => {
        if (!instructionSet) return;
        primeSpeech();
        setIsModifying(true);
        handleStopReading();
        setPendingMod(null);

        try {
            if (isEcoSwitch) {
                if (!originalInstructionSet) {
                    setOriginalInstructionSet(JSON.parse(JSON.stringify(instructionSet)));
                }
            }

            const updated = await modifyInstructions(instructionSet, prompt);
            if (isEcoSwitch) {
                setIsEcoApplied(true);
                updated.hasAnimalProducts = false;
            } else {
                updated.hasAnimalProducts = updated.hasAnimalProducts ?? instructionSet.hasAnimalProducts;
            }

            setInstructionSet(updated);
            setCompletedSteps(new Array((updated.steps || []).length).fill(false));
            const chatMsg = customChatMsg || "I've updated the instructions for you.";
            setChatHistory(prev => [...prev, { role: Role.ASSISTANT, content: chatMsg }]);
            speak(chatMsg);
        } catch (e) {
            setError("Update failed.");
        } finally {
            setIsModifying(false);
        }
    }, [instructionSet, originalInstructionSet, speak, primeSpeech, handleStopReading]);

    const handleConfirmModification = useCallback(() => {
        if (pendingMod) {
            handleModifyInstructions(pendingMod.prompt, false);
        }
    }, [pendingMod, handleModifyInstructions]);

    const handleCancelModification = useCallback(() => {
        setPendingMod(null);
        const msg = "Okay, I won't change the instructions.";
        setChatHistory(prev => [...prev, { role: Role.ASSISTANT, content: msg }]);
        speak(msg);
    }, [speak]);

    const handleRevertInstructions = useCallback(() => {
        if (!originalInstructionSet) return;
        handleStopReading();
        setInstructionSet(JSON.parse(JSON.stringify(originalInstructionSet)));
        setCompletedSteps(new Array(originalInstructionSet.steps.length).fill(false));
        setIsEcoApplied(false);
        setOriginalInstructionSet(null);
        
        const msg = "Reverted to the original version.";
        setChatHistory(prev => [...prev, { role: Role.ASSISTANT, content: msg }]);
        speak(msg);
    }, [originalInstructionSet, handleStopReading, speak]);

    const handleSendMessage = useCallback(async (message: string) => {
        if (!instructionSet || isAnswering) return;
        primeSpeech();
        setIsAnswering(true);
        handleStopReading();
        setChatHistory(prev => [...prev, { role: Role.USER, content: message }]);

        try {
            const intentResult = await detectModificationIntent(message);
            
            if (intentResult && (intentResult === 'NEW_TOPIC' || intentResult.includes('NEW_TOPIC'))) {
                setIsAnswering(false);
                await handleFetchInstructions(message);
            } else if (intentResult && intentResult.startsWith('READ_STEP_')) {
                setIsAnswering(false);
                const stepMatch = intentResult.match(/\d+/);
                const stepNum = stepMatch ? parseInt(stepMatch[0], 10) : null;
                
                if (stepNum && stepNum > 0 && stepNum <= instructionSet.steps.length) {
                    const stepText = instructionSet.steps[stepNum - 1];
                    const fullResponse = `Here is Step ${stepNum}: ${stepText}`;
                    setChatHistory(prev => [...prev, { role: Role.ASSISTANT, content: fullResponse }]);
                    speak(fullResponse);
                } else {
                    const errorMsg = stepNum 
                        ? `Step ${stepNum} doesn't exist. There are ${instructionSet.steps.length} steps in total.`
                        : `I couldn't identify which step you wanted me to read. Please say something like "read step 3".`;
                    setChatHistory(prev => [...prev, { role: Role.ASSISTANT, content: errorMsg }]);
                    speak(errorMsg);
                }
            } else if (intentResult && intentResult !== 'FALSE') {
                setIsAnswering(false);
                setPendingMod({ prompt: message, summary: intentResult });
                const question = `Would you like to rerender the instructions for "${intentResult.toLowerCase()}"?`;
                setChatHistory(prev => [...prev, { role: Role.ASSISTANT, content: question }]);
                speak(question);
            } else {
                const aiResponse = await getChatResponse(instructionSet, chatHistory, message, completedSteps);
                setChatHistory(prev => [...prev, { role: Role.ASSISTANT, content: aiResponse }]);
                speak(aiResponse);
                setIsAnswering(false);
            }
        } catch (e) {
            setIsAnswering(false);
            console.error("Message handling error:", e);
        }
    }, [instructionSet, isAnswering, speak, chatHistory, completedSteps, primeSpeech, handleStopReading, handleFetchInstructions]);

    return (
        <div 
            className="min-h-screen bg-primary text-text-primary font-sans flex flex-col"
            onClick={primeSpeech}
            onTouchStart={primeSpeech}
        >
            <header className="bg-secondary p-3 shadow-md sticky top-0 z-20">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BotIcon className="w-5 h-5 text-accent" />
                        <h1 className="text-md md:text-lg font-bold tracking-tight">Chef AI Assistant</h1>
                    </div>
                    <div className="flex items-center gap-2">
                         <button
                            onClick={() => setIsContinuousListening(prev => !prev)}
                            className={`p-2 rounded-full transition-all ${isContinuousListening ? 'bg-red-600 scale-110 shadow-lg shadow-red-900/40' : 'bg-primary/50 hover:bg-primary'}`}
                            title="Voice Input"
                        >
                            <MicIcon className="w-5 h-5 text-white" />
                        </button>
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-2 rounded-full bg-primary/50 hover:bg-primary transition-all"
                            title="Mute/Unmute"
                        >
                            {isMuted ? <SpeakerMuteIcon className="w-5 h-5" /> : <SpeakerIcon className="w-5 h-5 text-accent" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto p-4 flex flex-col gap-4 max-w-4xl">
                <UrlInputForm onFetch={handleFetchInstructions} isLoading={isLoading || isModifying} />
                
                {error && <div className="bg-red-900/50 p-3 rounded-lg text-sm border border-red-700 animate-pulse">{error}</div>}
                
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="relative">
                           <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-accent rounded-full"></div>
                           <div className="absolute inset-0 flex items-center justify-center">
                               <BotIcon className="w-5 h-5 text-accent animate-pulse" />
                           </div>
                        </div>
                        <p className="text-accent font-medium animate-pulse">Analyzing content...</p>
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
                            onStopReading={handleStopReading}
                            isReadingInstructions={isReadingInstructions}
                            isMuted={isMuted}
                            onEcoSwitch={() => handleModifyInstructions("Regenerate this recipe completely as a sustainable VEGAN version. Replace all animal products (meat, poultry, seafood, dairy, eggs, honey) with plant-based alternatives.", true, "I've updated this to a fully vegan, sustainable version.")}
                            onRevert={handleRevertInstructions}
                            isModifying={isModifying}
                            isEcoApplied={isEcoApplied}
                        />
                        {instructionSet.materials && instructionSet.materials.length > 0 && (
                            <ActionButtons onModify={handleModifyInstructions} disabled={isLoading || isAnswering || isModifying} />
                        )}
                    </div>
                )}
                
                {chatHistory.length > 0 && !isLoading && (
                    <div className="bg-secondary p-4 rounded-lg shadow-inner">
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
                        />
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
