
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { InstructionSet, ChatMessage as ChatMessageType, Role } from './types';
import { getInstructions, getChatResponse, modifyInstructions, detectModificationIntent } from './services/geminiService';
import UrlInputForm from './components/UrlInputForm';
import ChatInterface from './components/ChatInterface';
import InstructionDisplay from './components/RecipeDisplay';
import ActionButtons from './components/ActionButtons';
import CookingMode from './components/CookingMode';
import { BotIcon } from './components/icons/BotIcon';
import { SpeakerIcon } from './components/icons/SpeakerIcon';
import { SpeakerMuteIcon } from './components/icons/SpeakerMuteIcon';
import { MicIcon } from './components/icons/MicIcon';

const App: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
    const [instructionSet, setInstructionSet] = useState<InstructionSet | null>(null);
    const [originalInstructionSet, setOriginalInstructionSet] = useState<InstructionSet | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAnswering, setIsAnswering] = useState<boolean>(false);
    const [isModifying, setIsModifying] = useState<boolean>(false);
    const [isEcoApplied, setIsEcoApplied] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessageType[]>([]);
    
    // Dark Mode Effect
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const safeSetError = useCallback((err: any) => {
        if (!err) {
            setError(null);
            return;
        }
        let msg = "An error occurred";
        try {
            // Defensively check for Window objects to avoid SecurityError in cross-origin iframes
            const isWindow = err === window || (typeof Window !== 'undefined' && err instanceof Window);
            if (isWindow) {
                msg = "[System Error: Restricted Object]";
            } else if (typeof err === 'string') {
                msg = err;
            } else if (err instanceof Error) {
                msg = err.message;
            } else if (err && typeof err === 'object') {
                // Use a safe way to check for message
                const potentialMsg = (err as any).message;
                msg = potentialMsg ? String(potentialMsg) : String(err);
            } else {
                msg = String(err);
            }
        } catch (e) {
            msg = "A security or system error occurred";
        }
        setError(msg);
    }, []);

    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
    const [isContinuousListening, setIsContinuousListening] = useState<boolean>(false);
    const [isReadingMaterials, setIsReadingMaterials] = useState<boolean>(false);
    const [currentReadingStep, setCurrentReadingStep] = useState<number>(0);
    const [readingStatus, setReadingStatus] = useState<'idle' | 'reading' | 'paused'>('idle');
    const [isCookingMode, setIsCookingMode] = useState<boolean>(false);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [hasPrimed, setHasPrimed] = useState(false);
    const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
    const [pendingMod, setPendingMod] = useState<{ prompt: string; summary: string } | null>(null);
    const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
    
    const isMutedRef = useRef(isMuted);
    isMutedRef.current = isMuted;

    const stopReadingRef = useRef(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const recognitionRef = useRef<any>(null);
    const recognitionStateRef = useRef<'IDLE' | 'STARTING' | 'STARTED' | 'STOPPING'>('IDLE');
    const restartTimeoutRef = useRef<any>(null);
    const isContinuousListeningRef = useRef(isContinuousListening);
    const handleSendMessageRef = useRef<any>(null);

    const getLangTag = useCallback((lang: string | undefined): string => {
        if (!lang) return 'en-US';
        const clean = lang.toLowerCase().trim();
        
        if (/^(en|english)/.test(clean)) return 'en-US';
        if (/^(es|spanish|español)/.test(clean)) return 'es-ES';
        if (/^(fr|french|français)/.test(clean)) return 'fr-FR';
        if (/^(it|italian|italiano)/.test(clean)) return 'it-IT';
        if (/^(pt|portuguese|português)/.test(clean)) return 'pt-BR';
        if (/^(de|german|deutsch)/.test(clean)) return 'de-DE';
        if (/^(zh|chinese)/.test(clean)) return 'zh-CN';
        if (/^(ja|japanese)/.test(clean)) return 'ja-JP';
        if (/^(ko|korean)/.test(clean)) return 'ko-KR';
        if (/^(ru|russian)/.test(clean)) return 'ru-RU';
        if (/^(nl|dutch)/.test(clean)) return 'nl-NL';
        
        return clean.replace('_', '-');
    }, []);

    const getTranslatedWelcome = useCallback((title: string, lang: string): string => {
        const clean = lang.toLowerCase();
        if (clean.startsWith('es')) {
            return `He extraído con éxito las instrucciones para "${title}". Ten en cuenta que puedes usar el botón de 'versión eco' para ver una alternativa sostenible o usar las herramientas de conversión métrica para ajustar las unidades. Hazme cualquier pregunta o solicita cualquier cambio. Cuando estés listo para comenzar, presiona el botón de inicio para entrar en el modo manos libres.`;
        }
        if (clean.startsWith('fr')) {
            return `J'ai extrait avec succès les instructions pour "${title}". Notez que vous pouvez utiliser le bouton 'version éco' pour voir une alternative durable ou utiliser les outils de conversion métrique pour ajuster les unités. Posez-moi des questions ou demandez des modifications. Lorsque vous êtes prêt à commencer, appuyez sur le bouton de démarrage pour passer en mode mains libres.`;
        }
        if (clean.startsWith('it')) {
            return `Ho estratto con successo le istruzioni per "${title}". Tieni presente che puoi utilizzare il pulsante 'versione eco' per vedere un'alternativa sostenibile o utilizzare gli strumenti di conversione metrica per regolare le unità. Fammi qualsiasi domanda o chiedimi di apportare modifiche. Quando sei pronto per iniziare, premi il pulsante di avvio per passare alla modalità vivavoce.`;
        }
        if (clean.startsWith('de')) {
            return `Ich habe die Anweisungen für "${title}" erfolgreich extrahiert. Beachten Sie, dass Sie die Schaltfläche 'Öko-Version' verwenden können, um eine nachhaltige Alternative zu sehen, oder die metrischen Konvertierungstools verwenden können, um die Einheiten anzupassen. Stellen Sie mir Fragen oder bitten Sie um Änderungen. Wenn Sie bereit sind zu beginnen, drücken Sie die Starttaste, um in den Freisprechmodus zu wechseln.`;
        }
        if (clean.startsWith('pt')) {
            return `Extraí com sucesso as instruções para "${title}". Observe que você pode usar o botão 'versão eco' para ver uma alternativa sustentável ou usar as ferramentas de conversão métrica para ajustar as unidades. Faça-me qualquer pergunta ou peça para fazer alterações. Quando estiver pronto para começar, pressione o botão iniciar para entrar no modo mãos-livres.`;
        }
        return `I have successfully extracted the instructions for "${title}". Note that you can use the 'eco version' button to see a sustainable alternative or use the metric conversion tools to adjust the units. Ask me any questions or to make any changes. When you are ready to begin, press the start button to go into hands free mode.`;
    }, []);

    const primeSpeech = useCallback(async () => {
        if (!window.speechSynthesis) return;
        
        if (!hasPrimed) {
            const utterance = new SpeechSynthesisUtterance('');
            utterance.volume = 0;
            window.speechSynthesis.speak(utterance);
            setHasPrimed(true);
        }

        // Proactive microphone permission request
        // This ensures the browser popup appears until the user makes a choice
        if (micPermissionState !== 'granted' && micPermissionState !== 'denied') {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop());
                    setMicPermissionState('granted');
                } catch (err: any) {
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setMicPermissionState('denied');
                    } else {
                        setMicPermissionState('prompt');
                    }
                }
            }
        }
    }, [hasPrimed, micPermissionState]);

    const speak = useCallback((text: string, onEnd?: () => void, langOverride?: string) => {
        if (!window.speechSynthesis || isMutedRef.current || !text) {
            onEnd?.();
            return;
        }
        window.speechSynthesis.cancel();
        
        const safeText = String(text).replace(/[*#]/g, '');
        const utterance = new SpeechSynthesisUtterance(safeText);
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
        setIsReadingMaterials(false);
        setReadingStatus('idle');
        setCurrentReadingStep(0);
        setIsCookingMode(false);
        setIsEcoApplied(false);
        setOriginalInstructionSet(null);
        setPendingMod(null);
        stopReadingRef.current = true;
        setSpeakingMessageIndex(null);

        try {
            const data = await getInstructions(input, imageData);
            
            const isError = data.title.toLowerCase().includes('error') || (data.steps || []).length === 0;
            if (isError) {
                const errorMsg = data.welcomeMessage || "I couldn't find those instructions. Please check the input is correct.";
                safeSetError(errorMsg);
                speak(errorMsg);
                setIsLoading(false);
                return;
            }

            setInstructionSet(data);
            setCompletedSteps(new Array((data.steps || []).length).fill(false));
            
            const lang = getLangTag(data.language);
            const welcomeMsg = data.welcomeMessage || getTranslatedWelcome(data.title, lang);
            
            setChatHistory([{ role: Role.ASSISTANT, content: welcomeMsg, language: lang }]);
            speak(welcomeMsg, undefined, lang);
        } catch (e: any) {
            const errorMsg = "I couldn't find those instructions. Please check the input is correct.";
            safeSetError(e);
            speak(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [speak, primeSpeech, getLangTag]);

    const handleReadInstructions = useCallback((indexOverride?: number | any) => {
        if (!instructionSet || isMuted || !window.speechSynthesis) return;
        
        const actualIndex = typeof indexOverride === 'number' ? indexOverride : undefined;
        
        if (readingStatus === 'reading' && actualIndex === undefined) {
            window.speechSynthesis.cancel();
            setReadingStatus('paused');
            return;
        }

        if (readingStatus === 'paused' && window.speechSynthesis.paused && actualIndex === undefined) {
            window.speechSynthesis.resume();
            setReadingStatus('reading');
            return;
        }

        stopReadingRef.current = false;
        setIsReadingMaterials(false);
        setSpeakingMessageIndex(null);
        
        const lang = getLangTag(instructionSet.language);
        
        let index = actualIndex !== undefined ? actualIndex : currentReadingStep;
        
        // Only auto-find first uncompleted step if we are starting from scratch and not in cooking mode
        if (actualIndex === undefined && readingStatus === 'idle' && !isCookingMode) {
            const firstUncompleted = completedSteps.findIndex(c => !c);
            index = firstUncompleted === -1 ? 0 : firstUncompleted;
        }

        if (index >= instructionSet.steps.length) {
            setReadingStatus('idle');
            setCurrentReadingStep(0);
            return;
        }

        setReadingStatus('reading');
        setCurrentReadingStep(index);

        const stepText = instructionSet.steps[index];
        const textToSpeak = isCookingMode ? `Step ${index + 1}: ${stepText}` : stepText;
        
        speak(textToSpeak, () => {
            if (!stopReadingRef.current) {
                setReadingStatus('paused');
                // We no longer auto-increment, waiting for user input
            }
        }, lang);
    }, [instructionSet, completedSteps, isMuted, speak, getLangTag, readingStatus, currentReadingStep, isCookingMode]);

    const handleReadMaterials = useCallback(() => {
        if (!instructionSet || isMuted || !window.speechSynthesis) return;
        
        stopReadingRef.current = false;
        setIsReadingMaterials(true);
        setReadingStatus('idle');
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
        setIsReadingMaterials(false);
        setReadingStatus('idle');
    }, []);

    const handleStartCooking = useCallback(async () => {
        if (!instructionSet) return;
        
        // Ensure mic permission before starting hands-free mode
        if (micPermissionState !== 'granted') {
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop());
                    setMicPermissionState('granted');
                }
            } catch (err: any) {
                setMicPermissionState('denied');
                safeSetError("Hands-free mode requires microphone access. Please allow it in your browser settings to continue.");
                return;
            }
        }

        primeSpeech();
        
        // Find next unchecked step
        const nextStep = completedSteps.findIndex(c => !c);
        const startIndex = nextStep === -1 ? 0 : nextStep;
        
        setCurrentReadingStep(startIndex);
        setIsCookingMode(true);
        setIsContinuousListening(true); // Auto-activate microphone
        handleStopReading();
        
        // Small delay to ensure mode is active before reading
        setTimeout(() => {
            setReadingStatus('idle'); // Reset to idle so handleReadInstructions starts fresh
            handleReadInstructions();
        }, 300);
    }, [instructionSet, completedSteps, primeSpeech, handleReadInstructions, handleStopReading]);

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
            safeSetError("Update failed.");
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

    const requestModification = useCallback((prompt: string, summary: string, skipConfirmation: boolean = false) => {
        if (isCookingMode) return;
        if (skipConfirmation) {
            handleModifyInstructions(prompt, prompt.includes("VEGAN") || summary.toLowerCase().includes("eco"));
            return;
        }
        setPendingMod({ prompt, summary });
        setChatHistory(prev => [...prev, { role: Role.ASSISTANT, content: `Confirm modification: ${summary}?` }]);
        speak("Confirm changes?");
    }, [speak, isCookingMode, handleModifyInstructions]);

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
        if (!instructionSet) return;

        const lowerMsg = message.toLowerCase().trim().replace(/[.,?!]/g, '');
        
        // Voice Commands - More robust matching
        const isNext = /\b(next|next step|forward|go next)\b/.test(lowerMsg);
        const isBack = /\b(go back|previous|back|previous step|go bacl)\b/.test(lowerMsg);
        const isStop = /\b(stop|pause|wait|hold on|hush|quiet)\b/.test(lowerMsg);
        const isContinue = /\b(continue|resume|go on|keep going)\b/.test(lowerMsg);
        const isReadMaterials = /\b(read materials|ingredients|what do i need)\b/.test(lowerMsg);
        const isReadSteps = /\b(read steps|read instructions|start reading)\b/.test(lowerMsg);
        const isExit = /\b(exit|close|quit|stop cooking)\b/.test(lowerMsg);
        const isRestart = /\b(restart|start over|from the beginning)\b/.test(lowerMsg);

        // If we are answering, only allow stop/pause to interrupt
        if (isAnswering && !isStop) return;
        
        // Match "step 5", "go to step 3", etc.
        const stepMatch = lowerMsg.match(/(?:go to )?step (\d+)/);
        const targetStepNum = stepMatch ? parseInt(stepMatch[1], 10) : null;

        if (targetStepNum !== null && instructionSet) {
            const targetIndex = targetStepNum - 1;
            if (targetIndex >= 0 && targetIndex < instructionSet.steps.length) {
                handleStopReading();
                setCurrentReadingStep(targetIndex);
                setTimeout(() => handleReadInstructions(targetIndex), 100);
                return;
            }
        }

        if (isReadMaterials) {
            handleReadMaterials();
            return;
        }
        if (isReadSteps) {
            if (readingStatus !== 'reading') handleReadInstructions();
            return;
        }
        if (isStop) {
            if (isReadingMaterials) {
                handleStopReading();
            } else if (readingStatus === 'reading') {
                handleReadInstructions(); // Toggles to paused
            }
            return;
        }
        if (isContinue) {
            if (readingStatus === 'paused') {
                handleReadInstructions();
            } else if (isCookingMode && readingStatus === 'idle') {
                if (currentReadingStep < (instructionSet?.steps.length || 0) - 1) {
                    setCurrentReadingStep(prev => prev + 1);
                    setTimeout(() => handleReadInstructions(), 100);
                } else {
                    handleReadInstructions();
                }
            }
            return;
        }
        if (isNext) {
            if (isCookingMode) {
                // Mark current step as completed
                setCompletedSteps(prev => {
                    const next = [...prev];
                    if (currentReadingStep < next.length) {
                        next[currentReadingStep] = true;
                    }
                    return next;
                });

                if (currentReadingStep < (instructionSet?.steps.length || 0) - 1) {
                    handleStopReading();
                    const nextStep = currentReadingStep + 1;
                    setCurrentReadingStep(nextStep);
                    setTimeout(() => handleReadInstructions(nextStep), 100);
                }
                return;
            }
            // If not in cooking mode but reading instructions
            if (readingStatus === 'paused' || readingStatus === 'reading') {
                window.speechSynthesis.cancel();
                const nextStep = currentReadingStep + 1;
                setCurrentReadingStep(nextStep);
                setReadingStatus('paused');
                setTimeout(() => handleReadInstructions(nextStep), 100);
            }
            return;
        }
        if (isBack) {
            if (isCookingMode && currentReadingStep > 0) {
                handleStopReading();
                const prevStep = currentReadingStep - 1;
                setCurrentReadingStep(prevStep);
                setTimeout(() => handleReadInstructions(prevStep), 100);
            }
            return;
        }
        if (isExit) {
            if (isCookingMode) {
                handleStopReading();
                setIsCookingMode(false);
                setIsContinuousListening(false);
            }
            return;
        }
        if (isRestart) {
            handleStopReading();
            setCurrentReadingStep(0);
            setReadingStatus('paused'); // Force use of index 0
            setTimeout(() => {
                handleReadInstructions();
            }, 100);
            return;
        }

        // If in cooking mode, only allow the commands above. 
        // Ignore any other speech to prevent the assistant from talking to itself or getting confused.
        if (isCookingMode) return;

        primeSpeech();
        setIsAnswering(true);
        handleStopReading();
        setChatHistory(prev => [...prev, { role: Role.USER, content: message }]);

        try {
            const intent = await detectModificationIntent(message, instructionSet?.language || 'en-US');
            
            if (intent?.type === 'MODIFICATION' && instructionSet) {
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
    }, [instructionSet, isAnswering, speak, chatHistory, completedSteps, primeSpeech, handleStopReading, requestModification, getLangTag, isCookingMode, currentReadingStep, readingStatus, isReadingMaterials, handleReadInstructions, handleReadMaterials]);

    // Keep refs in sync
    useEffect(() => {
        isContinuousListeningRef.current = isContinuousListening;
    }, [isContinuousListening]);

    useEffect(() => {
        handleSendMessageRef.current = handleSendMessage;
    }, [handleSendMessage]);

    // Global Speech Recognition Initialization
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.interimResults = true; // Enable interim results for low latency
        recognition.continuous = false;

        let networkErrorRetryCount = 0;
        const MAX_NETWORK_RETRIES = 3;

        recognition.onend = () => {
            setIsListening(false);
            recognitionStateRef.current = 'IDLE';
            
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            
            // Auto-restart if continuous listening is enabled
            if (isContinuousListeningRef.current) {
                // Slightly longer delay to avoid "network" errors from rapid restarts
                const delay = networkErrorRetryCount > 0 ? Math.min(1000 * Math.pow(2, networkErrorRetryCount), 5000) : 300;
                
                restartTimeoutRef.current = setTimeout(() => {
                    if (isContinuousListeningRef.current && recognitionStateRef.current === 'IDLE') {
                        try { 
                            if (recognitionRef.current) {
                                recognitionStateRef.current = 'STARTING';
                                recognitionRef.current.start(); 
                            }
                        } catch (e) { 
                            recognitionStateRef.current = 'IDLE';
                            // Ignore "already started" errors
                        }
                    }
                }, delay);
            }
        };

        recognition.onstart = () => {
            setIsListening(true);
            recognitionStateRef.current = 'STARTED';
            networkErrorRetryCount = 0; // Reset retry count on successful start
        };

        recognition.onerror = (event: any) => {
            recognitionStateRef.current = 'IDLE';
            const isBenign = event.error === 'aborted' || event.error === 'no-speech';
            const isNetwork = event.error === 'network';

            if (!isBenign && !isNetwork) {
                console.error('Speech recognition error', String(event.error));
            }

            if (isNetwork) {
                networkErrorRetryCount++;
                if (networkErrorRetryCount > MAX_NETWORK_RETRIES) {
                    console.error('Max network retries reached for speech recognition');
                    setIsContinuousListening(false);
                }
            }

            if (event.error === 'not-allowed') {
                setIsContinuousListening(false);
                safeSetError("Microphone permission denied. Please enable it in your browser settings to use voice commands.");
            }
        };

        let lastProcessedTranscript = '';
        let lastProcessedTime = 0;

        recognition.onresult = (event: any) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript.toLowerCase().trim();
            const isFinal = result.isFinal;

            // Fast-path for commands using interim results
            // This drastically reduces latency for short commands
            const isCommand = /\b(next|back|stop|pause|continue|resume|step \d+|hush|quiet)\b/.test(transcript);
            const isUrgentStop = /\b(stop|pause|wait|hold on|hush|quiet)\b/.test(transcript);

            // Immediate interruption for stop/pause commands
            if (isUrgentStop && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            
            // Only process if it's a new command or final result
            // Debounce to prevent double-triggering within 1 second for the same transcript
            const now = Date.now();
            if (isCommand || isFinal) {
                if (transcript !== lastProcessedTranscript || (now - lastProcessedTime > 1500)) {
                    // For interim results, we only trigger if it's a clear command match
                    if (isFinal || isCommand) {
                        handleSendMessageRef.current(transcript);
                        lastProcessedTranscript = transcript;
                        lastProcessedTime = now;
                        
                        // If it was a command caught in interim, we might want to stop the current recognition 
                        // to prevent the "final" version of the same speech from triggering it again
                        if (!isFinal && isCommand) {
                            try { recognition.stop(); } catch (e) {}
                        }
                    }
                }
            }
        };

        return () => {
            isContinuousListeningRef.current = false;
            try { recognition.abort(); } catch (e) {}
        };
    }, []); // Initialize once

    // Update language when it changes
    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = instructionSet?.language ? getLangTag(instructionSet.language) : 'en-US';
        }
    }, [instructionSet?.language, getLangTag]);

    const handleToggleListening = useCallback(async () => {
        if (!isContinuousListening) {
            try {
                // Explicitly request permission
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop());
                    setMicPermissionState('granted');
                }
                setIsContinuousListening(true);
            } catch (err: any) {
                console.error("Microphone permission error:", err);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setMicPermissionState('denied');
                    safeSetError("Microphone access is blocked. Please click the lock icon in your browser's address bar to allow microphone access, then try again.");
                } else {
                    safeSetError("Could not access microphone. Please ensure it is connected and not in use by another app.");
                }
            }
        } else {
            setIsContinuousListening(false);
        }
    }, [isContinuousListening, safeSetError]);

    const handleNewSearch = useCallback(() => {
        handleStopReading();
        setInstructionSet(null);
        setOriginalInstructionSet(null);
        setCompletedSteps([]);
        setChatHistory([]);
        setError(null);
        setIsEcoApplied(false);
        setIsCookingMode(false);
        setIsContinuousListening(false);
    }, [handleStopReading]);

    // Control start/stop
    useEffect(() => {
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        
        if (isContinuousListening) {
            if (recognitionStateRef.current === 'IDLE' && recognitionRef.current) {
                try { 
                    recognitionStateRef.current = 'STARTING';
                    recognitionRef.current.start(); 
                } catch (e) {
                    recognitionStateRef.current = 'IDLE';
                    // Ignore "already started" errors
                }
            }
        } else {
            if ((recognitionStateRef.current === 'STARTED' || recognitionStateRef.current === 'STARTING') && recognitionRef.current) {
                try { 
                    recognitionStateRef.current = 'STOPPING';
                    recognitionRef.current.stop(); 
                } catch (e) {
                    recognitionStateRef.current = 'IDLE';
                    // Ignore errors
                }
            }
        }
    }, [isContinuousListening]);

    return (
        <div className="min-h-screen bg-primary text-text-secondary font-sans flex flex-col" onClick={primeSpeech} onTouchStart={primeSpeech}>
            <header className="bg-secondary p-3 shadow-md sticky top-0 z-20">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BotIcon className="w-5 h-5 text-accent" />
                        <h1 className="text-md md:text-lg font-bold tracking-tight text-text-primary">Chef AI Assistant</h1>
                        {instructionSet?.language && (
                            <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded ml-2 font-mono uppercase">
                                {instructionSet.language}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-primary/50 hover:bg-primary transition-all" title="Toggle Theme">
                            {isDarkMode ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-accent">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M3 12h2.25m.386-6.364 1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M3 12h2.25m.386-6.364 1.591-1.591M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-accent">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                                </svg>
                            )}
                        </button>
                         <button onClick={handleToggleListening} className={`p-2 rounded-full transition-all ${isContinuousListening ? 'bg-error scale-110 shadow-lg' : 'bg-primary/50 hover:bg-primary'}`}>
                            <MicIcon className="w-5 h-5 text-white" />
                        </button>
                        <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full bg-primary/50 hover:bg-primary">
                            {isMuted ? <SpeakerMuteIcon className="w-5 h-5 text-gray-500" /> : <SpeakerIcon className="w-5 h-5 text-accent" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto p-4 flex flex-col gap-4 max-w-4xl">
                {!instructionSet && !isLoading && (
                    <div className="flex-grow flex flex-col items-center justify-center -mt-20">
                        <div className="w-full max-w-2xl">
                            <UrlInputForm onFetch={handleFetchInstructions} isLoading={isLoading || isModifying} isLandingPage={true} />
                        </div>
                    </div>
                )}
                
                {instructionSet && !isLoading && (
                    <div className="flex justify-end">
                        <button 
                            onClick={handleNewSearch}
                            className="text-xs font-bold text-accent uppercase tracking-widest hover:text-accent/80 flex items-center gap-2 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            New Search
                        </button>
                    </div>
                )}

                {error && (
                    <div className="bg-error/20 text-error p-4 rounded-xl animate-fade-in flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                        </svg>
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}
                
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4 bg-secondary/30 rounded-xl">
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
                            onReadInstructions={() => handleReadInstructions()}
                            onReadMaterials={handleReadMaterials}
                            onStopReading={handleStopReading}
                            readingStatus={readingStatus}
                            isReadingMaterials={isReadingMaterials}
                            isMuted={isMuted}
                            onEcoSwitch={isCookingMode ? undefined : () => requestModification("Regenerate as a sustainable VEGAN version.", "Vegan conversion", true)}
                            onRevert={isCookingMode ? undefined : handleRevertInstructions}
                            isModifying={isModifying}
                            isEcoApplied={isEcoApplied}
                            onStartCooking={handleStartCooking}
                        />
                        <ActionButtons onModify={(p, s) => requestModification(p, s, true)} disabled={isLoading || isAnswering || isModifying || isCookingMode} />
                    </div>
                )}
                
                {chatHistory.length > 0 && !isLoading && (
                    <div className="bg-secondary p-4 rounded-xl shadow-inner">
                        <ChatInterface
                            chatHistory={chatHistory}
                            onSendMessage={handleSendMessage}
                            isAnswering={isAnswering || isModifying}
                            isCookingMode={isCookingMode}
                            isContinuousListening={isContinuousListening}
                            onToggleListening={handleToggleListening}
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

            {isCookingMode && instructionSet && (
                <CookingMode 
                    instructionSet={instructionSet}
                    currentStepIndex={currentReadingStep}
                    completedSteps={completedSteps}
                    readingStatus={readingStatus}
                    isListening={isListening}
                    isContinuousListening={isContinuousListening}
                    onToggleListening={handleToggleListening}
                    onNext={() => {
                        if (currentReadingStep < instructionSet.steps.length - 1) {
                            handleStopReading();
                            const nextStep = currentReadingStep + 1;
                            setCurrentReadingStep(nextStep);
                            setTimeout(() => handleReadInstructions(nextStep), 100);
                        }
                    }}
                    onBack={() => {
                        if (currentReadingStep > 0) {
                            handleStopReading();
                            const prevStep = currentReadingStep - 1;
                            setCurrentReadingStep(prevStep);
                            setTimeout(() => handleReadInstructions(prevStep), 100);
                        }
                    }}
                    onTogglePause={() => handleReadInstructions()}
                    onExit={() => {
                        handleStopReading();
                        setIsCookingMode(false);
                        setIsContinuousListening(false);
                    }}
                    onToggleStep={(i) => {
                        const next = [...completedSteps];
                        next[i] = !next[i];
                        setCompletedSteps(next);
                    }}
                />
            )}
        </div>
    );
};

export default App;
