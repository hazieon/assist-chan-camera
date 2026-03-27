
import React, { useState, useRef, useEffect } from 'react';
import { MicIcon } from './icons/MicIcon';
import { CameraIcon } from './icons/CameraIcon';
import { StopIcon } from './icons/StopIcon';
import { BotIcon } from './icons/BotIcon';

interface UrlInputFormProps {
    onFetch: (input: string, imageData?: { data: string, mimeType: string }) => void;
    isLoading: boolean;
    isLandingPage?: boolean;
    suggestions?: string[];
}

const RANDOM_RECIPES = [
    "Spaghetti Carbonara",
    "Chicken Tikka Masala",
    "Beef Wellington",
    "Vegetable Stir Fry",
    "Mushroom Risotto",
    "Classic Margherita Pizza",
    "Fish and Chips",
    "Tacos al Pastor",
    "Pad Thai",
    "Greek Salad",
    "French Onion Soup",
    "Beef Bourguignon",
    "Ratatouille",
    "Eggs Benedict",
    "Pancakes with Maple Syrup",
    "Sushi Rolls",
    "Butter Chicken",
    "Lasagna",
    "Caesar Salad",
    "Falafel Wrap"
];

const UrlInputForm: React.FC<UrlInputFormProps> = ({ onFetch, isLoading, isLandingPage = false, suggestions = [] }) => {
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionStateRef = useRef<'IDLE' | 'STARTING' | 'STARTED' | 'STOPPING'>('IDLE');
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    
    const [camPermissionState, setCamPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
    
    const recognitionRef = useRef<any>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Sync isProcessingImage with global isLoading
    useEffect(() => {
        if (!isLoading) {
            setIsProcessingImage(false);
        }
    }, [isLoading]);

    // Initialise Speech Recognition
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
                recognitionStateRef.current = 'STARTED';
            };

            recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result: any) => result.transcript)
                    .join('');
                setInputValue(transcript);
                
                if (event.results[0].isFinal) {
                    setIsListening(false);
                    onFetch(transcript);
                }
            };

            recognition.onerror = () => {
                setIsListening(false);
                recognitionStateRef.current = 'IDLE';
            };
            recognition.onend = () => {
                setIsListening(false);
                recognitionStateRef.current = 'IDLE';
            };
            recognitionRef.current = recognition;
        }

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [onFetch]);

    // Camera Stream Management
    useEffect(() => {
        let activeStream: MediaStream | null = null;

        const startCamera = async () => {
            if (!isCameraActive) return;

            try {
                // Request permissions explicitly first if needed, or just try with constraints
                const constraints = { 
                    video: { 
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    } 
                };
                
                // On some mobile browsers, specifically requesting environment camera is better
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                activeStream = stream;
                streamRef.current = stream;
                setCamPermissionState('granted');

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Ensure video plays on mobile
                    videoRef.current.setAttribute('playsinline', 'true');
                    try {
                        await videoRef.current.play();
                    } catch (playErr) {
                        // This is often a non-fatal error if the user hasn't interacted yet
                        console.warn("Video play failed:", playErr);
                    }
                }
            } catch (err: any) {
                // Silently try fallback without noisy console error if it's just a constraint issue
                
                // Fallback to any video device
                try {
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    activeStream = fallbackStream;
                    streamRef.current = fallbackStream;
                    setCamPermissionState('granted');
                    if (videoRef.current) {
                        videoRef.current.srcObject = fallbackStream;
                        videoRef.current.setAttribute('playsinline', 'true');
                        await videoRef.current.play();
                    }
                } catch (retryErr: any) {
                    // Only log if it's not a permission error, or log as warning
                    if (retryErr.name === 'NotAllowedError' || retryErr.name === 'PermissionDeniedError') {
                        setCamPermissionState('denied');
                    } else {
                        console.warn("Camera access failed:", retryErr.name);
                    }
                    setIsCameraActive(false);
                }
            }
        };

        if (isCameraActive) {
            startCamera();
        } else {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCameraActive]);

    const toggleListening = () => {
        if (isListening || recognitionStateRef.current === 'STARTED' || recognitionStateRef.current === 'STARTING') {
            recognitionStateRef.current = 'STOPPING';
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            if (recognitionStateRef.current !== 'IDLE') return;
            setInputValue('');
            try {
                recognitionStateRef.current = 'STARTING';
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (e) {
                recognitionStateRef.current = 'IDLE';
                console.error("Speech recognition failed to start", e);
            }
        }
    };

    const toggleCamera = async () => {
        if (!isCameraActive) {
            // Reset state if trying again
            if (camPermissionState === 'denied') {
                setCamPermissionState('prompt');
            }
            
            // Proactive camera permission request
            if (camPermissionState !== 'granted') {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    stream.getTracks().forEach(track => track.stop());
                    setCamPermissionState('granted');
                } catch (err: any) {
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setCamPermissionState('denied');
                        // Don't alert here, we'll show it in the UI
                        return;
                    }
                }
            }
            setIsCameraActive(true);
        } else {
            setIsCameraActive(false);
        }
    };

    const stopCamera = () => {
        setIsCameraActive(false);
    };

    const captureImage = () => {
        if (!videoRef.current || !videoRef.current.videoWidth) {
            console.warn("Video not ready for capture");
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            const base64Data = dataUrl.split(',')[1];
            setIsProcessingImage(true);
            onFetch('', { data: base64Data, mimeType: 'image/jpeg' });
            stopCamera();
        }
    };

    const handleRandomRecipe = () => {
        const randomRecipe = RANDOM_RECIPES[Math.floor(Math.random() * RANDOM_RECIPES.length)];
        setInputValue(randomRecipe);
        onFetch(randomRecipe);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onFetch(inputValue.trim());
        }
    };

    return (
        <div className={`${isLandingPage ? 'bg-transparent border-none shadow-none' : 'bg-secondary p-6 rounded-lg shadow-lg border border-gray-300 dark:border-transparent'} animate-fade-in flex flex-col gap-4`}>
            <div className={`flex flex-col gap-2 relative ${isLandingPage ? 'items-center text-center mb-8' : ''}`}>
                <div className={`flex items-center justify-between ${isLandingPage ? 'flex-col gap-6' : ''}`}>
                    <h2 className={`${isLandingPage ? 'text-4xl sm:text-6xl md:text-8xl mb-4' : 'text-2xl sm:text-3xl md:text-4xl'} font-black text-text-primary tracking-tighter uppercase`}>
                        {isLandingPage ? (
                            <>
                                <span className="text-accent">CHEF</span> ASSISTANT
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="text-accent">ADJUST</span> RECIPE
                            </div>
                        )}
                    </h2>
                    {!isLandingPage && (
                        <button 
                            onClick={() => setShowInfo(!showInfo)}
                            className={`p-1.5 rounded-full transition-all ${showInfo ? 'bg-accent text-white' : 'text-gray-500 hover:text-accent'}`}
                            title="How it works"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                            </svg>
                        </button>
                    )}
                </div>
                <p className={`${isLandingPage ? 'text-base sm:text-lg md:text-xl' : 'text-xs sm:text-sm'} text-text-secondary`}>
                    {isLandingPage ? 'Your personal cooking assistant' : 'Ask for adjustments, dietary swaps, or scaling'}
                </p>
                
                {showInfo && !isLandingPage && (
                    <div className="mt-2 p-3 bg-primary/40 rounded-lg text-xs leading-relaxed text-text-secondary animate-fade-in">
                        <span className="text-accent font-bold">Tech Insight:</span> Gemini 3 uses multimodal AI to intelligently extract text, ingredients, and instructions from photos, capturing details like temperatures and dates that standard OCR misses.
                    </div>
                )}
            </div>

            {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {suggestions.map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setInputValue(suggestion);
                                onFetch(suggestion);
                            }}
                            className="bg-accent text-white hover:bg-white hover:text-accent text-xs px-3 py-1.5 rounded-full border border-accent transition-all active:scale-95 whitespace-nowrap shadow-sm"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}

            {isCameraActive && (
                <div className="flex flex-col gap-4 animate-fade-in">
                    <div className="bg-accent/10 border-l-4 border-accent p-4 rounded-r-lg">
                        <p className="text-sm md:text-base text-text-primary font-medium leading-relaxed">
                            Take a photo of a written recipe or instructions. Or even take a photo of a meal you would like to try to cook!
                        </p>
                    </div>
                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-inner flex flex-col items-center justify-center">
                    {camPermissionState === 'denied' ? (
                        <div className="p-6 text-center space-y-4 animate-fade-in">
                            <div className="bg-error/20 p-4 rounded-full inline-block">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-error">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                </svg>
                            </div>
                            <h4 className="text-white font-bold">Camera Access Blocked</h4>
                            <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                Please click the lock icon in your browser's address bar to allow camera access, then try again.
                            </p>
                            <button 
                                onClick={() => setIsCameraActive(false)}
                                className="bg-gray-700 text-white px-6 py-2 rounded-full font-bold hover:bg-gray-600 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <>
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover" 
                            />
                            
                            {/* Scanning Feedback Overlay */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div className="w-full h-[2px] bg-accent shadow-[0_0_15px_#4f46e5] animate-[scan_2s_infinite]"></div>
                            </div>

                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
                                <button 
                                    onClick={captureImage}
                                    className="bg-accent text-white px-6 py-2 rounded-full font-bold shadow-lg active:scale-95 transition-all hover:bg-accent/90 flex items-center gap-2"
                                >
                                    <CameraIcon className="w-5 h-5" />
                                    Capture & Scan
                                </button>
                                <button 
                                    onClick={stopCamera}
                                    className="bg-gray-700 text-white p-2 rounded-full shadow-lg active:scale-95 hover:bg-gray-600"
                                >
                                    <StopIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            )}

            {isProcessingImage && (
                <div className="flex flex-col items-center justify-center p-8 bg-primary/50 rounded-lg gap-4 animate-pulse">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-accent font-bold text-lg">OCR: Scanning Image...</span>
                    </div>
                    <p className="text-text-secondary text-center text-sm">Gemini is interpreting the text and structure from your photo.</p>
                </div>
            )}

            {!isCameraActive && !isProcessingImage && (
                <div className="flex flex-col gap-4">
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <div className="flex-grow relative flex items-center">
                            <input
                                id="recipe-input"
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={isListening ? "Listening..." : (isLandingPage ? "Search, paste a URL, or scan instructions" : "e.g. Make it gluten free...")}
                                className={`w-full ${isLandingPage ? 'p-4 text-lg rounded-2xl' : 'p-4 text-base rounded-full'} pr-24 bg-secondary border-2 border-gray-300 dark:border-gray-600 focus:ring-4 focus:ring-accent/30 focus:outline-none transition-all placeholder-gray-500 ${isListening ? 'shadow-[0_0_25px_rgba(79,70,229,0.5)]' : 'shadow-xl'}`}
                                disabled={isLoading}
                                required
                                inputMode="search"
                                enterKeyHint="search"
                            />
                            <div className="absolute right-4 flex items-center gap-2">
                                <button
                                    id="camera-btn"
                                    type="button"
                                    onClick={toggleCamera}
                                    className="p-2 rounded-full text-accent hover:bg-gray-700 transition-all"
                                    title="Camera Scan"
                                    disabled={isLoading}
                                >
                                    <CameraIcon className="w-6 h-6" />
                                </button>
                                <button
                                    id="mic-btn"
                                    type="button"
                                    onClick={toggleListening}
                                    className={`p-2 rounded-full transition-all ${isListening ? 'bg-error text-white animate-pulse' : 'text-accent hover:bg-gray-700'}`}
                                    title="Voice Search"
                                    disabled={isLoading}
                                >
                                    <MicIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-center shrink-0">
                            <button
                                id="search-btn"
                                type="submit"
                                className={`bg-accent text-white px-8 py-3.5 font-bold ${isLandingPage ? 'rounded-2xl' : 'rounded-full'} hover:bg-accent/90 transition-all active:scale-95 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px] shadow-lg h-full`}
                                disabled={isLoading || !inputValue.trim()}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Thinking...
                                    </>
                                ) : (
                                    isLandingPage ? 'Search' : 'Adjust'
                                )}
                            </button>
                        </div>
                    </form>

                    {isLandingPage && (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-text-secondary text-sm font-medium">Not sure what to cook? Try a random recipe.</p>
                            <button
                                id="random-btn"
                                type="button"
                                onClick={handleRandomRecipe}
                                className="bg-white text-black border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-bold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-200 transition-all active:scale-95 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center shadow-md"
                                disabled={isLoading}
                            >
                                Random Recipe
                            </button>
                        </div>
                    )}
                </div>
            )}
            <style>{`
                @keyframes scan {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(220px); }
                }
            `}</style>
        </div>
    );
};

export default UrlInputForm;
