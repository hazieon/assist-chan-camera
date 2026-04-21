
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
import { ChevronDownIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
    const logTime = useCallback((label: string, startTime: number) => {
        const duration = (performance.now() - startTime).toFixed(2);
        console.log(`[DEV_METRIC] ${label}: ${duration}ms`);
    }, []);

    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('theme');
            if (saved) return saved === 'dark';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        } catch (e) {
            return false; // Default to light
        }
    });
    const [instructionSet, setInstructionSet] = useState<InstructionSet | null>(null);
    const [originalInstructionSet, setOriginalInstructionSet] = useState<InstructionSet | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAnswering, setIsAnswering] = useState<boolean>(false);
    const [isModifying, setIsModifying] = useState<boolean>(false);
    const [isEcoApplied, setIsEcoApplied] = useState<boolean>(false);
    const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessageType[]>([]);
    const [loadingText, setLoadingText] = useState<string>("gathering seasonings");
    const [tutorialStep, setTutorialStep] = useState<number | null>(null);

    const loadingPhrases = [
        "gathering seasonings",
        "fetching spices",
        "mixing sauces",
        "preheating oven",
        "chopping vegetables",
        "simmering broth",
        "whisking eggs",
        "kneading dough",
        "sautéing garlic",
        "garnishing dish",
        "marinating proteins",
        "reducing glazes",
        "zesting citrus",
        "infusing oils",
        "caramelising onions"
    ];

    // Randomized loading text effect
    useEffect(() => {
        if (isLoading) {
            setLoadingText(loadingPhrases[Math.floor(Math.random() * loadingPhrases.length)]);
            const interval = setInterval(() => {
                setLoadingText(loadingPhrases[Math.floor(Math.random() * loadingPhrases.length)]);
            }, 2500);
            return () => clearInterval(interval);
        }
    }, [isLoading]);

    // Tutorial initialisation
    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
        if (!hasSeenTutorial) {
            // Delay a bit to ensure elements are rendered
            setTimeout(() => setTutorialStep(0), 1000);
        }
    }, []);

    const nextTutorialStep = () => {
        if (tutorialStep !== null) {
            if (tutorialStep < 3) {
                setTutorialStep(tutorialStep + 1);
            } else {
                setTutorialStep(null);
                localStorage.setItem('hasSeenTutorial', 'true');
            }
        }
    };
    
    // Dark Mode Effect
    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            try { localStorage.setItem('theme', 'dark'); } catch (e) {}
        } else {
            root.classList.remove('dark');
            try { localStorage.setItem('theme', 'light'); } catch (e) {}
        }
        
        // Update theme-color meta tag for mobile/tablet status bars
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', isDarkMode ? '#2d333b' : '#f8f9fa');
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
    
    // Global mute handler
    const toggleMute = useCallback(() => {
        const newMute = !isMuted;
        setIsMuted(newMute);
        if (newMute && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setIsReadingMaterials(false);
            setReadingStatus('idle');
        }
    }, [isMuted]);

    const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
    const [isContinuousListening, setIsContinuousListening] = useState<boolean>(false);
    const [isReadingMaterials, setIsReadingMaterials] = useState<boolean>(false);
    const [currentReadingStep, setCurrentReadingStep] = useState<number>(0);
    const [readingStatus, setReadingStatus] = useState<'idle' | 'reading' | 'paused'>('idle');
    const [isCookingMode, setIsCookingMode] = useState<boolean>(false);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [hasPrimed, setHasPrimed] = useState(false);
    const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const [pendingMod, setPendingMod] = useState<{ prompt: string; summary: string } | null>(null);
    const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
    const [isMicReady, setIsMicReady] = useState<boolean>(false);
    const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
    const [lastSearchInput, setLastSearchInput] = useState<string>('');
    const [isKeywordSearch, setIsKeywordSearch] = useState<boolean>(false);
    const [interimTranscript, setInterimTranscript] = useState<string>('');
    
    const isMutedRef = useRef(isMuted);
    isMutedRef.current = isMuted;

    const stopReadingRef = useRef(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const resumeIntervalRef = useRef<any>(null);
    const recognitionRef = useRef<any>(null);
    const recognitionStateRef = useRef<'IDLE' | 'STARTING' | 'STARTED' | 'STOPPING'>('IDLE');
    const restartTimeoutRef = useRef<any>(null);
    const isContinuousListeningRef = useRef(isContinuousListening);
    const isSpeakingRef = useRef(isSpeaking);
    const isCookingModeRef = useRef(isCookingMode);
    const handleSendMessageRef = useRef<any>(null);

    useEffect(() => {
        isContinuousListeningRef.current = isContinuousListening;
    }, [isContinuousListening]);

    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    useEffect(() => {
        isCookingModeRef.current = isCookingMode;
    }, [isCookingMode]);

    useEffect(() => {
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'microphone' as any }).then(result => {
                setMicPermissionState(result.state as any);
                result.onchange = () => setMicPermissionState(result.state as any);
            }).catch(() => {});
        }

        // Trigger voice loading for Chrome
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
            const handleVoicesChanged = () => window.speechSynthesis.getVoices();
            window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
            return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        }
    }, []);

    const playBeep = useCallback((isStart: boolean = true) => {
        if (isMutedRef.current) return;
        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            
            const audioCtx = new AudioContextClass();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.frequency.value = isStart ? 660 : 440;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
            
            // Cleanup context
            setTimeout(() => {
                if (audioCtx.state !== 'closed') audioCtx.close();
            }, 200);
        } catch (e) {}
    }, []);

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
            // Speak a short silent utterance to "wake up" the audio context
            const utterance = new SpeechSynthesisUtterance(' ');
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

        // Clear any existing resume interval
        if (resumeIntervalRef.current) {
            clearInterval(resumeIntervalRef.current);
            resumeIntervalRef.current = null;
        }

        const startTime = performance.now();
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        
        const safeText = ' . . ' + String(text).replace(/[*#]/g, '');
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
        utterance.onstart = () => {
            setIsSpeaking(true);
            logTime('TTS_READ_ALOUD_START', startTime);

            // Chrome bug workaround: speech stops after ~15s
            // Periodically calling resume() keeps it going
            if (resumeIntervalRef.current) clearInterval(resumeIntervalRef.current);
            resumeIntervalRef.current = setInterval(() => {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }
            }, 10000);
        };

        const cleanup = () => {
            setIsSpeaking(false);
            utteranceRef.current = null;
            if (resumeIntervalRef.current) {
                clearInterval(resumeIntervalRef.current);
                resumeIntervalRef.current = null;
            }
            onEnd?.();
        };

        utterance.onend = cleanup;
        utterance.onerror = cleanup;

        // Small delay before speaking to prevent cut-off in some browsers
        // Increased delay to 350ms and added a "warm-up" silent utterance
        setTimeout(() => {
            if (!isMutedRef.current) {
                // Warm up the engine with a silent utterance if it's the first time or after a cancel
                const warmUp = new SpeechSynthesisUtterance(' ');
                warmUp.volume = 0;
                window.speechSynthesis.speak(warmUp);
                
                // Speak the actual content
                window.speechSynthesis.speak(utterance);
            }
        }, 350);
    }, [instructionSet, getLangTag, logTime]);

    const toggleMessageSpeech = useCallback((index: number, text: string, lang?: string) => {
        if (speakingMessageIndex === index) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setSpeakingMessageIndex(null);
        } else {
            setSpeakingMessageIndex(index);
            speak(text, () => setSpeakingMessageIndex(null), lang);
        }
    }, [speakingMessageIndex, speak]);

    const handleFetchInstructions = useCallback(async (input: string, imageData?: { data: string, mimeType: string }) => {
        if (!input && !imageData) return;
        const startTime = performance.now();
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
        
        // Track if it's a keyword search
        setLastSearchInput(input);
        const isUrl = input.trim().toLowerCase().startsWith('http');
        setIsKeywordSearch(!isUrl && !imageData);

        try {
            const data = await getInstructions(input, imageData);
            console.log("Recipe JSON Data:", data);
            logTime('FETCH_RECIPE_RESPONSE', startTime);
            
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
    }, [speak, primeSpeech, getLangTag, safeSetError, logTime]);

    const handleRegenerate = useCallback(() => {
        if (lastSearchInput) {
            handleFetchInstructions(lastSearchInput);
        }
    }, [lastSearchInput, handleFetchInstructions]);

    const suggestions = useMemo(() => {
        if (!instructionSet) return [];
        const base = ["Make it gluten free", "Scale for 10 people"];
        
        // Pick a material to suggest a swap
        if (instructionSet.materials && instructionSet.materials.length > 0) {
            const commonSwaps: Record<string, string> = {
                'butter': 'coconut oil',
                'milk': 'oat milk',
                'egg': 'flax egg',
                'sugar': 'honey',
                'flour': 'almond flour',
                'chicken': 'tofu',
                'beef': 'mushrooms',
                'cream': 'cashew cream',
                'cheese': 'nutritional yeast',
                'pasta': 'zucchini noodles',
                'rice': 'cauliflower rice'
            };
            
            let foundSwap = false;
            for (const material of instructionSet.materials) {
                const lower = material.toLowerCase();
                for (const [key, val] of Object.entries(commonSwaps)) {
                    if (lower.includes(key)) {
                        base.push(`Swap ${key} for ${val}`);
                        foundSwap = true;
                        break;
                    }
                }
                if (foundSwap) break;
            }
        }
        
        return base.slice(0, 3);
    }, [instructionSet]);

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
                // Auto-increment to next step with a small natural pause
                setTimeout(() => {
                    if (!stopReadingRef.current) {
                        handleReadInstructions(index + 1);
                    }
                }, 1000);
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
            // Ensure we read the full material text (quantity + name)
            speak(text, () => {
                if (!stopReadingRef.current) {
                    setTimeout(() => readMaterial(index + 1), 800);
                }
            }, lang);
        };

        readMaterial(0);
    }, [instructionSet, isMuted, speak, getLangTag]);

    const handleStopReading = useCallback(() => {
        stopReadingRef.current = true;
        window.speechSynthesis.cancel();
        if (resumeIntervalRef.current) {
            clearInterval(resumeIntervalRef.current);
            resumeIntervalRef.current = null;
        }
        setIsSpeaking(false);
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
        const startTime = performance.now();
        primeSpeech();
        setIsModifying(true);
        
        const lang = getLangTag(instructionSet.language);
        speak("Processing.", undefined, lang);
        
        handleStopReading();
        setPendingMod(null);

        try {
            if (isEcoSwitch && !originalInstructionSet) {
                setOriginalInstructionSet(JSON.parse(JSON.stringify(instructionSet)));
            }

            const updated = await modifyInstructions(instructionSet, prompt);
            console.log("Updated Recipe JSON Data:", updated);
            logTime('ALTERATION_RESPONSE', startTime);
            if (isEcoSwitch) {
                setIsEcoApplied(true);
                updated.hasAnimalProducts = false;
            }

            setInstructionSet(updated);
            setCompletedSteps(new Array((updated.steps || []).length).fill(false));
            
            const updatedLang = getLangTag(updated.language);
            const confirmationText = isEcoSwitch ? "Eco-friendly version applied. Instructions updated." : "Instructions updated successfully.";
            setChatHistory(prev => [...prev, { role: Role.ASSISTANT, content: confirmationText, language: updatedLang }]);
            speak(confirmationText, undefined, updatedLang);
        } catch (e) {
            safeSetError("Update failed.");
        } finally {
            setIsModifying(false);
        }
    }, [instructionSet, originalInstructionSet, speak, primeSpeech, handleStopReading, getLangTag, logTime]);

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
        
        const lang = getLangTag(originalInstructionSet.language);
        speak("Reverting changes.", undefined, lang);
        
        setInstructionSet(JSON.parse(JSON.stringify(originalInstructionSet)));
        setCompletedSteps(new Array(originalInstructionSet.steps.length).fill(false));
        setIsEcoApplied(false);
        setOriginalInstructionSet(null);
        
        speak("Reverted to original.", undefined, lang);
    }, [originalInstructionSet, handleStopReading, speak, getLangTag]);

    const handleSendMessage = useCallback(async (message: string, image?: string) => {
        if (!instructionSet) {
            if (message || image) {
                const imageData = image ? { data: image.split(',')[1] || image, mimeType: 'image/jpeg' } : undefined;
                handleFetchInstructions(message, imageData);
            }
            return;
        }

        const lowerMsg = message.toLowerCase().trim().replace(/[.,?!]/g, '');
        
        // Voice Commands - More robust matching. Only trigger if it's a direct command to read.
        // We avoid simple keywords like "ingredients" blocking full sentences like "add chocolate to ingredients"
        const isNext = /^(next|next step|forward|go next)$/.test(lowerMsg);
        const isBack = /^(go back|previous|back|previous step|go bacl)$/.test(lowerMsg);
        const isStop = /^(stop|pause|wait|hold on|hush|quiet)$/.test(lowerMsg);
        const isContinue = /^(continue|resume|go on|keep going)$/.test(lowerMsg);
        const isReadMaterials = /^(read materials|ingredients|materials|what do i need)$/.test(lowerMsg) || 
                                /^(read|list|tell|tell me) (the )?ingredients$/.test(lowerMsg);
        const isReadSteps = /^(read steps|read instructions|start reading|steps)$/.test(lowerMsg) ||
                            /^(read|list|tell|tell me) (the )?steps$/.test(lowerMsg);
        const isExit = /^(exit|close|quit|stop cooking)$/.test(lowerMsg);
        const isRestart = /^(restart|start over|from the beginning)$/.test(lowerMsg);

        // If we are answering, only allow stop/pause to interrupt
        if (isAnswering && !isStop) return;
        
        // Match "step 5", "go to step 3", "step seven", etc.
        const wordToNum: Record<string, number> = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
            'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
        };

        const stepMatch = lowerMsg.match(/(?:go to |jump to )?step (\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)/);
        let targetStepNum: number | null = null;
        
        if (stepMatch) {
            const val = stepMatch[1];
            if (/^\d+$/.test(val)) {
                targetStepNum = parseInt(val, 10);
            } else {
                targetStepNum = wordToNum[val] || null;
            }
        }

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
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
                setReadingStatus('paused');
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
        const startTime = performance.now();
        setIsAnswering(true);
        handleStopReading();
        setChatHistory(prev => [...prev, { role: Role.USER, content: message, image }]);

        try {
            const intentStartTime = performance.now();
            // Only check for modification intent if there's no image
            const intent = !image ? await detectModificationIntent(message, instructionSet?.language || 'en-US') : null;
            if (intent) logTime('INTENT_DETECTION_RESPONSE', intentStartTime);
            
            if (intent?.type === 'MODIFICATION' && instructionSet) {
                setIsAnswering(false);
                requestModification(message, intent.summary);
            } else {
                const chatStartTime = performance.now();
                const aiResult = await getChatResponse(instructionSet, chatHistory, message, completedSteps, image);
                logTime('CHAT_ASSISTANT_RESPONSE', chatStartTime);
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
    }, [instructionSet, isAnswering, speak, chatHistory, completedSteps, primeSpeech, handleStopReading, requestModification, getLangTag, isCookingMode, currentReadingStep, readingStatus, isReadingMaterials, handleReadInstructions, handleReadMaterials, logTime]);

    // Keep refs in sync
    useEffect(() => {
        isContinuousListeningRef.current = isContinuousListening;
    }, [isContinuousListening]);

    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    useEffect(() => {
        handleSendMessageRef.current = handleSendMessage;
    }, [handleSendMessage]);

    // Global Speech Recognition Initialisation
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSpeechSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.interimResults = true;
        recognition.continuous = false; // Using false + auto-restart is more reliable across mobile/desktop

        let networkErrorRetryCount = 0;
        const MAX_NETWORK_RETRIES = 3;
        let lastEventTime = Date.now();

        // Watchdog to detect stuck recognition
        const watchdogInterval = setInterval(() => {
            if (isContinuousListeningRef.current && 
                recognitionStateRef.current === 'STARTED' && 
                Date.now() - lastEventTime > 10000) {
                console.log("[MIC] Watchdog: Recognition seems stuck, restarting...");
                try { recognition.stop(); } catch (e) {}
            }
        }, 5000);

        recognition.onend = () => {
            setIsListening(false);
            recognitionStateRef.current = 'IDLE';
            setInterimTranscript('');
            
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            
        // Auto-restart if continuous listening is enabled
        // In cooking mode, we restart even if speaking (so user can interrupt)
        // Outside cooking mode, we wait for speech to end to avoid hearing ourselves
        const shouldRestart = isContinuousListeningRef.current && 
            (isCookingModeRef.current || !isSpeakingRef.current);

        if (shouldRestart) {
            // Exponential backoff for network errors
            const delay = networkErrorRetryCount > 0 
                ? Math.min(1000 * Math.pow(2, networkErrorRetryCount), 10000) 
                : 150; // Very short delay for normal restarts
            
            restartTimeoutRef.current = setTimeout(() => {
                const stillShouldRestart = isContinuousListeningRef.current && 
                    (isCookingModeRef.current || !isSpeakingRef.current);

                if (stillShouldRestart && recognitionStateRef.current === 'IDLE') {
                    try { 
                        if (recognitionRef.current) {
                            recognitionStateRef.current = 'STARTING';
                            recognitionRef.current.start(); 
                        }
                    } catch (e) { 
                        recognitionStateRef.current = 'IDLE';
                    }
                }
            }, delay);
        }
        };

        let lastProcessedTranscript = '';
        let lastProcessedTime = 0;
        let recognitionStartTime = 0;

        recognition.onstart = () => {
            setIsListening(true);
            setIsMicReady(true);
            recognitionStateRef.current = 'STARTED';
            networkErrorRetryCount = 0; 
            recognitionStartTime = performance.now();
            lastEventTime = Date.now();
            playBeep(true);
        };

        recognition.onerror = (event: any) => {
            recognitionStateRef.current = 'IDLE';
            setIsMicReady(false);
            lastEventTime = Date.now();
            
            const isBenign = event.error === 'aborted' || event.error === 'no-speech';
            const isNetwork = event.error === 'network';

            if (!isBenign && !isNetwork) {
                console.error('[MIC] Speech recognition error:', event.error);
            }

            if (isNetwork) {
                networkErrorRetryCount++;
                if (networkErrorRetryCount > MAX_NETWORK_RETRIES) {
                    setIsContinuousListening(false);
                    safeSetError("Network error with speech recognition. Please check your connection.");
                }
            }

            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setIsContinuousListening(false);
                setMicPermissionState('denied');
                safeSetError("Microphone access is blocked or not supported. Please check your browser settings.");
            }
        };

        recognition.onresult = (event: any) => {
            lastEventTime = Date.now();
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript.toLowerCase().trim();
            const isFinal = result.isFinal;

            if (!transcript) return;
            setInterimTranscript(transcript);

            // Fast-path for commands using interim results
            const isCommand = /\b(next|back|stop|pause|continue|resume|step \d+|step (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)|hush|quiet)\b/.test(transcript);
            const isUrgentStop = /\b(stop|pause|wait|hold on|hush|quiet)\b/.test(transcript);

            if (isUrgentStop && (window.speechSynthesis.speaking || isSpeakingRef.current)) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
            }
            
            const now = Date.now();
            // If we are speaking, ONLY allow commands to be processed
            // This prevents the app from hearing itself and thinking it's a chat message
            const shouldProcess = isCommand || (isFinal && !isSpeakingRef.current);

            if (shouldProcess) {
                // Debounce to prevent double-triggering
                if (transcript !== lastProcessedTranscript || (now - lastProcessedTime > 2000)) {
                    if (isFinal || isCommand) {
                        if (recognitionStartTime > 0) {
                            logTime('STT_RESPONSE', recognitionStartTime);
                            recognitionStartTime = 0;
                        }
                        handleSendMessageRef.current(transcript);
                        lastProcessedTranscript = transcript;
                        lastProcessedTime = now;
                        
                        if (!isFinal && isCommand) {
                            try { recognition.stop(); } catch (e) {}
                        }
                    }
                }
            }
        };

        return () => {
            clearInterval(watchdogInterval);
            isContinuousListeningRef.current = false;
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            try { recognition.abort(); } catch (e) {}
        };
    }, []); // Initialise once

    // Update language when it changes
    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = instructionSet?.language ? getLangTag(instructionSet.language) : 'en-US';
        }
    }, [instructionSet?.language, getLangTag]);

    const handleToggleListening = useCallback(async () => {
        if (!isContinuousListening) {
            // Immediate visual feedback
            setIsContinuousListening(true);
            setIsMicReady(false);
            
            if (micPermissionState !== 'granted') {
                try {
                    // Explicitly request permission
                    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream.getTracks().forEach(track => track.stop());
                        setMicPermissionState('granted');
                    }
                } catch (err: any) {
                    setIsContinuousListening(false);
                    console.error("Microphone permission error:", err);
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setMicPermissionState('denied');
                        safeSetError("Microphone access is blocked. Please click the lock icon in your browser's address bar to allow microphone access, then try again.");
                    } else {
                        safeSetError("Could not access microphone. Please ensure it is connected and not in use by another app.");
                    }
                }
            }
        } else {
            setIsContinuousListening(false);
            setIsMicReady(false);
            playBeep(false);
        }
    }, [isContinuousListening, micPermissionState, safeSetError, playBeep]);

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
        
        const shouldBeListening = isContinuousListening && !isSpeaking;
        
        if (shouldBeListening) {
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
    }, [isContinuousListening, isSpeaking]);

    return (
        <div className="min-h-screen bg-primary text-text-secondary font-sans flex flex-col" onClick={primeSpeech} onTouchStart={primeSpeech}>
            <header className="bg-secondary p-3 shadow-md sticky top-0 z-20">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                        <BotIcon className="w-8 h-8 md:w-10 md:h-10 text-accent" />
                        <h1 className="text-lg md:text-2xl font-black tracking-tighter text-text-primary uppercase">
                            <span className="text-accent">CHEF</span> ASSISTANT
                        </h1>
                        {instructionSet?.language && (
                            <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded ml-2 font-mono uppercase">
                                {instructionSet.language}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-primary/50 hover:bg-primary active:scale-95 transition-all touch-manipulation" title="Toggle Theme">
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
                         <button 
                            onClick={handleToggleListening} 
                            className={`p-2 rounded-full transition-all active:scale-95 touch-manipulation relative ${
                                isContinuousListening 
                                ? (isMicReady ? 'bg-error scale-110 shadow-lg' : 'bg-warning scale-105 shadow-md') 
                                : 'bg-primary/50 hover:bg-primary'
                            }`}
                        >
                            <MicIcon className="w-5 h-5 text-white" />
                            {isContinuousListening && !isMicReady && (
                                <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" />
                            )}
                        </button>
                        <button onClick={toggleMute} className="p-2 rounded-full bg-primary/50 hover:bg-primary active:scale-95 transition-all touch-manipulation">
                            {isMuted ? <SpeakerMuteIcon className="w-5 h-5 text-gray-500" /> : <SpeakerIcon className="w-5 h-5 text-accent" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto p-4 flex flex-col gap-4 max-w-4xl">
                {!instructionSet && !isLoading && (
                    <div className="flex-grow flex flex-col items-center justify-center -mt-20">
                        <div className="w-full max-w-2xl">
                            <UrlInputForm 
                                onFetch={handleFetchInstructions} 
                                isLoading={isLoading || isModifying} 
                                isLandingPage={true} 
                                suggestions={suggestions}
                                onToggleListening={handleToggleListening}
                                isListening={isContinuousListening}
                                interimTranscript={interimTranscript}
                            />
                        </div>
                    </div>
                )}
                
                {instructionSet && !isLoading && (
                    <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-2 sm:gap-4">
                        {isKeywordSearch && (
                            <button 
                                onClick={handleRegenerate}
                                disabled={isModifying}
                                className="text-[10px] sm:text-xs font-bold text-text-secondary uppercase tracking-widest hover:text-accent active:scale-95 flex items-center gap-2 transition-all touch-manipulation disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                                Regenerate
                            </button>
                        )}
                        <button 
                            onClick={handleNewSearch}
                            className="text-[10px] sm:text-xs font-bold text-accent uppercase tracking-widest hover:text-accent/80 active:scale-95 flex items-center gap-2 transition-all touch-manipulation"
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

                {!isSpeechSupported && (
                    <div className="bg-accent/10 text-accent p-4 rounded-xl animate-fade-in flex items-center gap-3 border border-accent/20">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                        <p className="text-xs font-medium">Voice commands are not fully supported in this browser. For the best experience, please use Chrome or Safari.</p>
                    </div>
                )}
                
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4 bg-secondary/30 rounded-xl">
                        <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full"></div>
                        <p className="text-accent animate-pulse font-bold tracking-wide uppercase text-sm md:text-base">{loadingText}...</p>
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
                            onEcoSwitch={isCookingMode ? () => {} : () => requestModification("Regenerate as a sustainable VEGAN version.", "Vegan conversion", true)}
                            onRevert={isCookingMode ? () => {} : handleRevertInstructions}
                            isModifying={isModifying}
                            isEcoApplied={isEcoApplied}
                            onStartCooking={handleStartCooking}
                            isCookingMode={isCookingMode}
                            isKeywordSearch={isKeywordSearch}
                            onRegenerate={handleRegenerate}
                            onModify={(p, s) => requestModification(p, s, true)}
                        />
                    </div>
                )}
                
                {instructionSet && !isLoading && (
                    <div className="bg-secondary p-4 sm:p-6 rounded-xl shadow-inner border border-gray-300 dark:border-transparent">
                        <button 
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            className="flex items-center justify-between w-full mb-3 group cursor-pointer"
                        >
                            <h3 className="text-xl sm:text-2xl font-black text-text-primary uppercase tracking-tight">Chat Assistant</h3>
                            <ChevronDownIcon className={`w-5 h-5 text-accent/50 group-hover:text-accent transition-transform duration-300 ${isChatOpen ? '' : '-rotate-90'}`} />
                        </button>
                        <AnimatePresence>
                            {isChatOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                >
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
                                        suggestions={suggestions}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
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
            {/* Tutorial Overlay */}
            {tutorialStep !== null && (
                <TutorialOverlay step={tutorialStep} onNext={nextTutorialStep} />
            )}

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

interface TutorialOverlayProps {
    step: number;
    onNext: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext }) => {
    const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

    const steps = [
        { id: 'recipe-input', text: "Search for a recipe or paste a URL to get started." },
        { id: 'mic-btn', text: "Tap to search or ask questions hands-free." },
        { id: 'camera-btn', text: "Scan cookbook pages or food photos to digitise." },
        { id: 'search-btn', text: "Click to generate your interactive recipe." }
    ];

    useEffect(() => {
        const updateCoords = () => {
            const el = document.getElementById(steps[step].id);
            if (el) {
                const rect = el.getBoundingClientRect();
                setCoords({
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    height: rect.height
                });
            }
        };

        updateCoords();
        window.addEventListener('resize', updateCoords);
        return () => window.removeEventListener('resize', updateCoords);
    }, [step]);

    if (!coords) return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onNext}></div>
            <div 
                className="absolute transition-all duration-500 pointer-events-auto"
                style={{
                    top: coords.top - 10,
                    left: coords.left - 10,
                    width: coords.width + 20,
                    height: coords.height + 20,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                    borderRadius: '1rem',
                    border: '2px solid white'
                }}
            ></div>
            <div 
                className="absolute z-[101] pointer-events-auto animate-float"
                style={{
                    top: step === 0 ? coords.top + coords.height + 20 : coords.top - 120,
                    left: Math.max(20, Math.min(window.innerWidth - 300, coords.left + coords.width / 2 - 140)),
                    width: '280px'
                }}
            >
                <div className="bg-accent text-white p-4 rounded-2xl shadow-2xl relative">
                    <p className="text-sm font-bold leading-tight">{steps[step].text}</p>
                    <div className="mt-3 flex justify-between items-center">
                        <span className="text-[10px] opacity-70 uppercase tracking-widest">{step + 1} / 4</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onNext(); }}
                                className="bg-white text-accent px-3 py-1 rounded-full text-xs font-black uppercase hover:bg-gray-100 transition-all"
                            >
                                {step === 3 ? 'Got it!' : 'Next'}
                            </button>
                            {step < 3 && (
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        // Skip to end
                                        for(let i=step; i<4; i++) onNext();
                                    }}
                                    className="text-white/70 hover:text-white text-xs uppercase font-bold tracking-wider px-2"
                                >
                                    Skip Tutorial
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Arrow */}
                    <div 
                        className={`absolute w-4 h-4 bg-accent rotate-45 ${step === 0 ? '-top-2 left-1/2 -translate-x-1/2' : '-bottom-2 left-1/2 -translate-x-1/2'}`}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default App;
