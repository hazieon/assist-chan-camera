
import React, { useState, useRef, useEffect } from 'react';
import { MicIcon } from './icons/MicIcon';
import { CameraIcon } from './icons/CameraIcon';
import { StopIcon } from './icons/StopIcon';
import { BotIcon } from './icons/BotIcon';

interface UrlInputFormProps {
    onFetch: (input: string, imageData?: { data: string, mimeType: string }) => void;
    isLoading: boolean;
    isLanding?: boolean;
}

const UrlInputForm: React.FC<UrlInputFormProps> = ({ onFetch, isLoading, isLanding }) => {
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionStateRef = useRef<'IDLE' | 'STARTING' | 'STARTED' | 'STOPPING'>('IDLE');
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    
    const recognitionRef = useRef<any>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Sync isProcessingImage with global isLoading
    useEffect(() => {
        if (!isLoading) {
            setIsProcessingImage(false);
        }
    }, [isLoading]);

    // Initialize Speech Recognition
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
                const constraints = { 
                    video: { 
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                };
                
                activeStream = await navigator.mediaDevices.getUserMedia(constraints);
                streamRef.current = activeStream;

                if (videoRef.current) {
                    videoRef.current.srcObject = activeStream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                try {
                    activeStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    streamRef.current = activeStream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = activeStream;
                    }
                } catch (retryErr) {
                    console.error("Camera retry failed:", retryErr);
                    alert("Could not access camera. Please check permissions.");
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

    const toggleCamera = () => {
        setIsCameraActive(prev => !prev);
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onFetch(inputValue.trim());
        }
    };

    return (
        <div className={`${isLanding ? 'bg-transparent border-none shadow-none' : 'bg-secondary p-6 rounded-lg shadow-lg border border-gray-800'} animate-fade-in flex flex-col gap-4`}>
            {!isLanding && (
                <div className="flex flex-col gap-2 relative">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-accent">Smart Assistant</h2>
                        <button 
                            onClick={() => setShowInfo(!showInfo)}
                            className={`p-1.5 rounded-full border transition-all ${showInfo ? 'bg-accent border-accent text-white' : 'border-gray-700 text-gray-500 hover:border-accent hover:text-accent'}`}
                            title="How it works"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-text-secondary text-sm">Search, paste a URL, or scan physical instructions</p>
                    
                    {showInfo && (
                        <div className="mt-2 p-3 bg-primary/40 border border-accent/20 rounded-lg text-xs leading-relaxed text-text-secondary animate-fade-in">
                            <span className="text-accent font-bold">Tech Insight:</span> To interpret the text from the image input, Gemini 3 uses a multimodal method (beyond traditional OCR) to locate, interpret and extract text. It is relatively successful at detecting small text and discerning the spatial and semantic hierarchy of instructions, enabling it to intelligently separate materials from preparation steps while capturing crucial metadata like oven temperatures and expiration dates that standard OCR often misses.
                        </div>
                    )}
                </div>
            )}

            {isCameraActive && (
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2 border-accent/50 shadow-inner">
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
                            className="bg-accent text-white px-6 py-2 rounded-full font-bold shadow-lg active:scale-95 transition-all hover:bg-indigo-500 flex items-center gap-2"
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
                </div>
            )}

            {isProcessingImage && (
                <div className="flex flex-col items-center justify-center p-8 bg-primary/50 rounded-lg border border-accent/30 gap-4 animate-pulse">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-accent font-bold text-lg">OCR: Scanning Image...</span>
                    </div>
                    <p className="text-text-secondary text-center text-sm">Gemini is interpreting the text and structure from your photo.</p>
                </div>
            )}

            {!isCameraActive && !isProcessingImage && (
                <div className="flex flex-col gap-4">
                    <form onSubmit={handleSubmit} className={`flex flex-col sm:flex-row gap-3 ${isLanding ? 'max-w-3xl w-full mx-auto' : ''}`}>
                        <div className="flex-grow relative flex items-center">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={isListening ? "Listening..." : "How to bake... or paste URL..."}
                                className={`w-full ${isLanding ? 'p-5 text-lg rounded-2xl shadow-2xl' : 'p-4 rounded-lg'} pr-24 bg-primary border border-gray-700 focus:ring-2 focus:ring-accent focus:outline-none transition-all placeholder-gray-500 ${isListening ? 'border-accent shadow-[0_0_10px_rgba(79,70,229,0.3)]' : ''}`}
                                disabled={isLoading}
                                required
                            />
                            <div className="absolute right-3 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleCamera}
                                    className="p-2 rounded-full text-accent hover:bg-gray-700 transition-all"
                                    title="Camera Scan"
                                    disabled={isLoading}
                                >
                                    <CameraIcon className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-600 text-white animate-pulse' : 'text-accent hover:bg-gray-700'}`}
                                    title="Voice Search"
                                    disabled={isLoading}
                                >
                                    <MicIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            className={`${isLanding ? 'px-10 rounded-2xl' : 'px-8 rounded-lg'} bg-accent text-white font-bold py-3 hover:bg-indigo-500 transition-all active:scale-95 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px] shadow-lg`}
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
                            ) : 'Search'}
                        </button>
                    </form>
                    
                    {isLanding && (
                        <div className="flex flex-col items-center gap-4 mt-4">
                            <button 
                                onClick={() => setShowInfo(!showInfo)}
                                className="text-xs text-text-secondary hover:text-accent transition-colors flex items-center gap-1.5"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                </svg>
                                How it works
                            </button>
                            
                            {showInfo && (
                                <div className="max-w-xl p-4 bg-primary/40 border border-accent/20 rounded-xl text-xs leading-relaxed text-text-secondary animate-fade-in text-center">
                                    <span className="text-accent font-bold">Multimodal Extraction:</span> Gemini 3 interprets text and structure directly from images or URLs, intelligently separating ingredients from steps while capturing metadata like temperatures and times.
                                </div>
                            )}
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
