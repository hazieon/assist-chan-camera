
import React from 'react';
import { InstructionSet } from '../types';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { UndoIcon } from './icons/UndoIcon';
import { BotIcon } from './icons/BotIcon';
import { MicIcon } from './icons/MicIcon';

interface CookingModeProps {
    instructionSet: InstructionSet;
    currentStepIndex: number;
    completedSteps: boolean[];
    readingStatus: 'idle' | 'reading' | 'paused';
    isListening: boolean;
    isContinuousListening: boolean;
    onToggleListening: () => void;
    onNext: () => void;
    onBack: () => void;
    onTogglePause: () => void;
    onExit: () => void;
    onToggleStep: (index: number) => void;
}

const CookingMode: React.FC<CookingModeProps> = ({
    instructionSet,
    currentStepIndex,
    completedSteps,
    readingStatus,
    isListening,
    isContinuousListening,
    onToggleListening,
    onNext,
    onBack,
    onTogglePause,
    onExit,
    onToggleStep
}) => {
    const step = instructionSet.steps[currentStepIndex];
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === instructionSet.steps.length - 1;

    return (
        <div className="fixed inset-0 z-50 bg-primary flex flex-col animate-fade-in overflow-hidden">
            {/* Header - Sticky at top */}
            <div className="p-4 md:p-6 border-b border-border-base flex items-center justify-between bg-secondary/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <BotIcon className="w-6 h-6 text-accent" />
                    <h2 className="text-xs md:text-sm font-bold text-accent uppercase tracking-widest">Cooking Mode</h2>
                </div>
                <div className="flex items-center gap-3">
                    {isContinuousListening && (
                        <div className="hidden sm:flex items-center gap-2 mr-2">
                            <div className={`w-2 h-2 rounded-full bg-red-500 ${isListening ? 'animate-pulse' : 'opacity-50'}`} />
                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                {isListening ? 'Listening' : 'Ready'}
                            </span>
                        </div>
                    )}
                    <button 
                        onClick={onToggleListening}
                        className={`p-2.5 rounded-full transition-all ${isContinuousListening ? 'bg-red-600 shadow-lg scale-110' : 'bg-primary hover:bg-gray-800'}`}
                        title={isContinuousListening ? "Turn off Mic" : "Turn on Mic"}
                    >
                        <MicIcon className="w-5 h-5 text-white" />
                    </button>
                    <button 
                        onClick={onExit}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors ml-2"
                    >
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Exit</span>
                    </button>
                </div>
            </div>

            {/* Content - Scrollable area */}
            <div className="flex-grow flex flex-col items-center justify-center p-6 md:p-12 text-center overflow-y-auto">
                <div className="w-full max-w-3xl mx-auto">
                    <div className="mb-4 md:mb-8">
                        <span className="text-accent font-mono text-sm md:text-lg font-bold bg-accent/10 px-4 py-1 rounded-full border border-accent/20">
                            Step {currentStepIndex + 1}/{instructionSet.steps.length}
                        </span>
                    </div>
                    
                    <div className="min-h-[150px] md:min-h-[200px] flex items-center justify-center mb-8 md:mb-12">
                        <h3 className="text-xl md:text-4xl lg:text-5xl font-bold leading-tight text-text-primary">
                            {step}
                        </h3>
                    </div>

                    <div className="flex items-center justify-center gap-4 p-4 bg-secondary/30 rounded-2xl border border-border-base/50 max-w-xs mx-auto">
                        <input
                            type="checkbox"
                            id={`cooking-step-${currentStepIndex}`}
                            checked={completedSteps[currentStepIndex] ?? false}
                            onChange={() => onToggleStep(currentStepIndex)}
                            className="h-6 w-6 md:h-8 md:w-8 rounded-lg border-border-base bg-primary text-accent focus:ring-accent cursor-pointer transition-all"
                        />
                        <label 
                            htmlFor={`cooking-step-${currentStepIndex}`}
                            className="text-sm md:text-lg font-medium text-text-secondary cursor-pointer select-none"
                        >
                            Mark as completed
                        </label>
                    </div>
                </div>
            </div>

            {/* Controls - Sticky at bottom */}
            <div className="p-6 md:p-10 bg-secondary/80 backdrop-blur-md border-t border-border-base">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between gap-4 md:gap-8">
                        <button 
                            onClick={onBack}
                            disabled={isFirstStep}
                            className="flex-1 md:flex-none md:px-10 py-4 rounded-2xl bg-gray-800 text-white font-bold hover:bg-gray-700 disabled:opacity-20 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                        >
                            <UndoIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Back</span>
                        </button>

                        <button 
                            onClick={onTogglePause}
                            className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all shadow-2xl shrink-0 ${
                                readingStatus === 'reading' 
                                ? 'bg-orange-600 hover:bg-orange-500 scale-110' 
                                : 'bg-green-600 hover:bg-green-500'
                            }`}
                        >
                            {readingStatus === 'reading' ? (
                                <StopIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                            ) : (
                                <PlayIcon className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" />
                            )}
                        </button>

                        <button 
                            onClick={onNext}
                            disabled={isLastStep}
                            className="flex-1 md:flex-none md:px-10 py-4 rounded-2xl bg-accent text-white font-bold hover:bg-indigo-500 disabled:opacity-20 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                        >
                            <span className="hidden sm:inline">Next</span>
                            <PlayIcon className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="mt-6 md:mt-8 text-center">
                        <p className="text-[10px] md:text-xs text-text-secondary font-medium uppercase tracking-[0.2em] opacity-60">
                            Voice commands: "Next", "Go Back", "Pause", "Continue"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookingMode;
