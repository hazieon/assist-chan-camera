
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
        <div className="fixed inset-0 z-50 bg-primary flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in">
            <div className="w-full max-w-3xl bg-secondary rounded-3xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col h-full max-h-[80vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-secondary/50">
                    <div className="flex items-center gap-3">
                        <BotIcon className="w-6 h-6 text-accent" />
                        <h2 className="text-sm font-bold text-accent uppercase tracking-widest">Cooking Mode</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {isContinuousListening && (
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full bg-red-500 ${isListening ? 'animate-pulse' : 'opacity-50'}`} />
                                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                    {isListening ? 'Listening' : 'Ready'}
                                </span>
                            </div>
                        )}
                        <button 
                            onClick={onToggleListening}
                            className={`p-2 rounded-full transition-all ${isContinuousListening ? 'bg-red-600 shadow-lg scale-110' : 'bg-primary hover:bg-gray-800'}`}
                            title={isContinuousListening ? "Turn off Mic" : "Turn on Mic"}
                        >
                            <MicIcon className="w-5 h-5 text-white" />
                        </button>
                        <button 
                            onClick={onExit}
                            className="text-text-secondary hover:text-white transition-colors p-2 ml-2"
                        >
                            <span className="text-xs font-bold uppercase tracking-wider">Exit</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-y-auto">
                    <div className="mb-6">
                        <span className="text-accent font-mono text-lg font-bold">
                            Step {currentStepIndex + 1} of {instructionSet.steps.length}
                        </span>
                    </div>
                    
                    <h3 className="text-2xl md:text-4xl font-bold leading-tight text-white mb-8">
                        {step}
                    </h3>

                    <div className="flex items-center gap-4 mb-8">
                        <input
                            type="checkbox"
                            id={`cooking-step-${currentStepIndex}`}
                            checked={completedSteps[currentStepIndex] ?? false}
                            onChange={() => onToggleStep(currentStepIndex)}
                            className="h-8 w-8 rounded-lg border-gray-700 bg-primary text-accent focus:ring-accent cursor-pointer transition-all"
                        />
                        <label 
                            htmlFor={`cooking-step-${currentStepIndex}`}
                            className="text-lg font-medium text-text-secondary cursor-pointer select-none"
                        >
                            Mark as completed
                        </label>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-8 bg-primary/30 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <button 
                            onClick={onBack}
                            disabled={isFirstStep}
                            className="w-full md:w-auto px-8 py-4 rounded-2xl bg-gray-800 text-white font-bold hover:bg-gray-700 disabled:opacity-20 transition-all flex items-center justify-center gap-2"
                        >
                            <UndoIcon className="w-5 h-5" />
                            Back
                        </button>

                        <button 
                            onClick={onTogglePause}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                                readingStatus === 'reading' 
                                ? 'bg-orange-600 hover:bg-orange-500 scale-110' 
                                : 'bg-green-600 hover:bg-green-500'
                            }`}
                        >
                            {readingStatus === 'reading' ? (
                                <StopIcon className="w-8 h-8 text-white" />
                            ) : (
                                <PlayIcon className="w-8 h-8 text-white ml-1" />
                            )}
                        </button>

                        <button 
                            onClick={onNext}
                            disabled={isLastStep}
                            className="w-full md:w-auto px-8 py-4 rounded-2xl bg-accent text-white font-bold hover:bg-indigo-500 disabled:opacity-20 transition-all flex items-center justify-center gap-2"
                        >
                            Next
                            <PlayIcon className="w-5 h-5 rotate-0" />
                        </button>
                    </div>
                    
                    <div className="mt-6 text-center">
                        <p className="text-xs text-text-secondary font-medium uppercase tracking-[0.2em] opacity-50">
                            Voice commands: "Next", "Go Back", "Pause", "Continue"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookingMode;
