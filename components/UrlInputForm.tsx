
import React, { useState, useRef, useEffect } from 'react';
import { MicIcon } from './icons/MicIcon';
import { CameraIcon } from './icons/CameraIcon';
import { StopIcon } from './icons/StopIcon';
import { BotIcon } from './icons/BotIcon';

interface UrlInputFormProps {
    onFetch: (input: string, imageData?: { data: string, mimeType: string }) => void;
    isLoading: boolean;
}

const UrlInputForm: React.FC<UrlInputFormProps> = ({ onFetch, isLoading }) => {
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    
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

            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);
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
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            setInputValue('');
            try {
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (e) {
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
        <div className="bg-secondary p-6 rounded-lg shadow-lg border border-gray-800 animate-fade-in flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-accent">Smart Assistant</h2>
                <p className="text-text-secondary text-sm">Search, paste a URL, or scan physical instructions</p>
            </div>

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
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-grow relative flex items-center">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={isListening ? "Listening..." : "How to bake... or paste URL..."}
                            className={`w-full p-4 pr-24 bg-primary border border-gray-700 rounded-lg focus:ring-2 focus:ring-accent focus:outline-none transition-all placeholder-gray-500 ${isListening ? 'border-accent shadow-[0_0_10px_rgba(79,70,229,0.3)]' : ''}`}
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
                        className="bg-accent text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-500 transition-all active:scale-95 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px] shadow-lg"
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
                            'Get Instructions'
                        )}
                    </button>
                </form>
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
