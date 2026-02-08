
import React from 'react';
import { InstructionSet } from '../types';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { LeafIcon } from './icons/LeafIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { UndoIcon } from './icons/UndoIcon';
import { ClockIcon } from './icons/ClockIcon';
import { FireIcon } from './icons/FireIcon';
import { CalendarIcon } from './icons/CalendarIcon';

interface InstructionDisplayProps {
    instructionSet: InstructionSet;
    completedSteps: boolean[];
    onToggleStep: (index: number) => void;
    onReadInstructions: () => void;
    onStopReading: () => void;
    isReadingInstructions: boolean;
    isMuted: boolean;
    onEcoSwitch: () => void;
    onRevert: () => void;
    isModifying: boolean;
    isEcoApplied: boolean;
}

const InstructionDisplay: React.FC<InstructionDisplayProps> = ({ 
    instructionSet, 
    completedSteps, 
    onToggleStep,
    onReadInstructions,
    onStopReading,
    isReadingInstructions,
    isMuted,
    onEcoSwitch,
    onRevert,
    isModifying,
    isEcoApplied
}) => {
    const allStepsCompleted = completedSteps.length > 0 && completedSteps.every(Boolean);
    const showEcoButton = !!instructionSet.isFood && instructionSet.materials.length > 0;
    const hasSources = instructionSet.sources && instructionSet.sources.length > 0;
    const hasMaterials = instructionSet.materials && instructionSet.materials.length > 0;

    return (
        <div className="bg-secondary p-5 md:p-6 rounded-xl shadow-lg border border-gray-800 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 border-b border-gray-700 pb-6">
                <div className="flex-grow space-y-3">
                    <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                        {instructionSet.title}
                    </h2>

                    {/* Quick Metadata: Time, Temp, Expiry */}
                    {(instructionSet.cookingTime || instructionSet.ovenTemp || instructionSet.expiryDate) && (
                        <div className="flex flex-wrap gap-4 pt-1">
                            {instructionSet.cookingTime && (
                                <div className="flex items-center gap-2 bg-primary/50 px-3 py-1.5 rounded-full border border-accent/20 text-sm">
                                    <ClockIcon className="w-4 h-4 text-accent" />
                                    <span>{instructionSet.cookingTime}</span>
                                </div>
                            )}
                            {instructionSet.ovenTemp && (
                                <div className="flex items-center gap-2 bg-primary/50 px-3 py-1.5 rounded-full border border-orange-500/20 text-sm">
                                    <FireIcon className="w-4 h-4 text-orange-500" />
                                    <span>{instructionSet.ovenTemp}</span>
                                </div>
                            )}
                            {instructionSet.expiryDate && (
                                <div className="flex items-center gap-2 bg-red-900/20 px-3 py-1.5 rounded-full border border-red-500/20 text-sm text-red-200">
                                    <CalendarIcon className="w-4 h-4 text-red-500" />
                                    <span>Expires: {instructionSet.expiryDate}</span>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Primary Source Buttons */}
                    {hasSources && (
                        <div className="flex flex-wrap gap-2">
                            <a 
                                href={instructionSet.sources![0].uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:bg-indigo-500 transition-all text-sm font-bold shadow-md active:scale-95"
                            >
                                <ExternalLinkIcon className="w-4 h-4" />
                                <span>Open Original Page</span>
                            </a>
                        </div>
                    )}
                </div>
                
                {/* Secondary Actions (Eco/Revert) */}
                <div className="flex items-center gap-2 shrink-0">
                    {showEcoButton && (
                        isEcoApplied ? (
                            <button
                                onClick={onRevert}
                                disabled={isModifying}
                                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-all active:scale-95 shadow-md h-[40px] text-sm"
                                title="Back to original"
                            >
                                <UndoIcon className="w-4 h-4" />
                                <span>Revert</span>
                            </button>
                        ) : (
                            <button
                                onClick={onEcoSwitch}
                                disabled={isModifying}
                                className="flex items-center justify-center rounded-lg p-2 px-4 transition-all shadow-md active:scale-90 h-[40px] bg-green-600 hover:bg-green-500 text-white font-bold"
                                aria-label="Switch to sustainable version"
                                title="Make it eco-friendly"
                            >
                                <div className="flex items-center gap-2">
                                    <LeafIcon className="w-5 h-5 text-white animate-pulse" />
                                    <span className="text-sm">Eco-Version</span>
                                </div>
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Materials Section */}
            {hasMaterials && (
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-accent uppercase tracking-wider">Materials / Ingredients</h3>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm md:text-base text-text-secondary">
                        {instructionSet.materials.map((material, index) => (
                            <li key={index} className="flex items-start gap-2 bg-primary/30 p-2.5 rounded border border-gray-700/50">
                                <span className="text-accent font-bold">•</span> {material}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Instructions Section */}
            <section>
                 <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-accent uppercase tracking-wider">Instructions</h3>
                    </div>
                    {isReadingInstructions ? (
                        <button
                            onClick={onStopReading}
                            className="flex items-center gap-2 bg-red-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-red-500 transition-all active:scale-95 text-sm shadow-lg"
                        >
                            <StopIcon className="w-4 h-4" />
                            Stop Reading
                        </button>
                    ) : (
                        <button
                            onClick={onReadInstructions}
                            disabled={isMuted || allStepsCompleted}
                            className="flex items-center gap-2 bg-accent text-white font-bold py-2 px-5 rounded-lg hover:bg-indigo-500 transition-all active:scale-95 text-sm disabled:opacity-40 shadow-lg"
                        >
                            <PlayIcon className="w-4 h-4" />
                            Read All Steps
                        </button>
                    )}
                </div>
                <ol className="space-y-4">
                    {instructionSet.steps.map((step, index) => (
                        <li 
                            key={index} 
                            className={`flex items-start gap-3 p-4 rounded-lg transition-all border ${
                                completedSteps[index] 
                                ? 'bg-green-900/10 border-green-800/30 text-text-secondary italic line-through' 
                                : 'bg-primary/40 border-gray-700 shadow-sm'
                            }`}
                        >
                            <div className="flex-shrink-0 mt-1">
                                <input
                                    type="checkbox"
                                    id={`step-${index}`}
                                    checked={completedSteps[index] ?? false}
                                    onChange={() => onToggleStep(index)}
                                    className="h-6 w-6 rounded border-gray-600 bg-primary text-accent focus:ring-accent cursor-pointer"
                                />
                            </div>
                            <label
                                htmlFor={`step-${index}`}
                                className="flex-1 text-sm md:text-base leading-relaxed cursor-pointer select-none"
                            >
                                <span className="font-bold mr-2 text-accent">{index + 1}.</span>
                                {step}
                            </label>
                        </li>
                    ))}
                </ol>
            </section>

            {/* Footer Sources Section */}
            {hasSources && instructionSet.sources!.length > 0 && (
                <div className="mt-10 pt-6 border-t border-gray-700">
                    <h3 className="text-xs font-semibold text-text-secondary uppercase mb-4 tracking-widest">References & Additional Sources</h3>
                    <div className="flex flex-wrap gap-3">
                        {instructionSet.sources!.map((source, index) => (
                            <a 
                                key={index} 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs bg-primary/60 px-4 py-2 rounded-full text-accent hover:bg-accent hover:text-white transition-all flex items-center gap-2 border border-accent/20"
                            >
                                <ExternalLinkIcon className="w-3.5 h-3.5" />
                                <span className="max-w-[150px] truncate">{source.title || 'Source Link'}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstructionDisplay;
