
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
    onReadMaterials: () => void;
    onStopReading: () => void;
    readingStatus: 'idle' | 'reading' | 'paused';
    isReadingMaterials: boolean;
    isMuted: boolean;
    onEcoSwitch: () => void;
    onRevert: () => void;
    onStartCooking: () => void;
    isModifying: boolean;
    isEcoApplied: boolean;
}

const InstructionDisplay: React.FC<InstructionDisplayProps> = ({ 
    instructionSet, 
    completedSteps, 
    onToggleStep,
    onReadInstructions,
    onReadMaterials,
    onStopReading,
    readingStatus,
    isReadingMaterials,
    isMuted,
    onEcoSwitch,
    onRevert,
    onStartCooking,
    isModifying,
    isEcoApplied
}) => {
    const allStepsCompleted = completedSteps.length > 0 && completedSteps.every(Boolean);
    const showEcoButton = !!instructionSet.isFood && instructionSet.materials.length > 0;
    const hasSources = instructionSet.sources && instructionSet.sources.length > 0;
    const hasMaterials = instructionSet.materials && instructionSet.materials.length > 0;
    const completedCount = completedSteps.filter(Boolean).length;
    const totalCount = instructionSet.steps.length;

    return (
        <div className="bg-secondary p-5 md:p-6 rounded-xl shadow-lg border border-border-base animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 border-b border-border-base pb-6">
                <div className="flex-grow space-y-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl md:text-3xl font-bold leading-tight text-text-primary">
                            {instructionSet.title}
                        </h2>
                        {totalCount > 0 && (
                            <span className="shrink-0 bg-accent/10 text-accent text-[10px] font-bold px-2 py-1 rounded border border-accent/20 font-mono">
                                {completedCount}/{totalCount}
                            </span>
                        )}
                    </div>

                    {/* Quick Metadata */}
                    {(instructionSet.cookingTime || instructionSet.ovenTemp || instructionSet.expiryDate) && (
                        <div className="flex flex-wrap gap-3 pt-1">
                            {instructionSet.cookingTime && (
                                <div className="flex items-center gap-2 bg-primary/50 px-3 py-1.5 rounded-lg border border-accent/20 text-xs">
                                    <ClockIcon className="w-3.5 h-3.5 text-accent" />
                                    <span>{instructionSet.cookingTime}</span>
                                </div>
                            )}
                            {instructionSet.ovenTemp && (
                                <div className="flex items-center gap-2 bg-primary/50 px-3 py-1.5 rounded-lg border border-orange-500/20 text-xs text-orange-200">
                                    <FireIcon className="w-3.5 h-3.5 text-orange-500" />
                                    <span>{instructionSet.ovenTemp}</span>
                                </div>
                            )}
                            {instructionSet.expiryDate && (
                                <div className="flex items-center gap-2 bg-red-900/10 px-3 py-1.5 rounded-lg border border-red-500/20 text-xs text-red-300">
                                    <CalendarIcon className="w-3.5 h-3.5 text-red-500" />
                                    <span>Expires: {instructionSet.expiryDate}</span>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Primary Source Link */}
                    {hasSources && (
                        <div className="pt-2">
                            <a 
                                href={instructionSet.sources![0].uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-accent hover:text-indigo-400 text-sm font-bold underline underline-offset-4 decoration-accent/30 transition-all"
                            >
                                <ExternalLinkIcon className="w-4 h-4" />
                                <span>Visit Source Page</span>
                            </a>
                        </div>
                    )}
                </div>
                
                {/* Secondary Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={onStartCooking}
                        disabled={isModifying}
                        className="flex items-center gap-2 bg-accent hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-all h-[42px] text-sm shadow-lg border border-accent/20"
                    >
                        <PlayIcon className="w-4 h-4" />
                        <span>START</span>
                    </button>
                    {showEcoButton && (
                        isEcoApplied ? (
                            <button
                                onClick={onRevert}
                                disabled={isModifying}
                                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all h-[42px] text-sm shadow-md"
                            >
                                <UndoIcon className="w-4 h-4" />
                                <span>Original</span>
                            </button>
                        ) : (
                            <button
                                onClick={onEcoSwitch}
                                disabled={isModifying}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-all h-[42px] text-sm shadow-md"
                                title="Switch to eco version"
                            >
                                <LeafIcon className="w-5 h-5 text-white animate-pulse" />
                                <span>eco version</span>
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Materials Section */}
            {hasMaterials && (
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <h3 className="text-sm font-bold text-accent uppercase tracking-widest opacity-80">Materials & Ingredients</h3>
                        {isReadingMaterials ? (
                            <button
                                onClick={onStopReading}
                                className="flex items-center gap-2 bg-red-600/90 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-500 transition-all text-xs"
                            >
                                <StopIcon className="w-4 h-4" />
                                Stop Reading
                            </button>
                        ) : (
                            <button
                                onClick={onReadMaterials}
                                disabled={isMuted}
                                className="flex items-center gap-2 bg-accent/80 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-all text-xs disabled:opacity-40"
                            >
                                <PlayIcon className="w-4 h-4" />
                                read aloud
                            </button>
                        )}
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm md:text-base text-text-secondary">
                        {instructionSet.materials.map((material, index) => (
                            <li key={index} className="flex items-start gap-3 bg-primary/20 p-3 rounded-lg border border-border-base/40">
                                <span className="text-accent font-bold">•</span> {material}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Instructions Section */}
            <section>
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <h3 className="text-sm font-bold text-accent uppercase tracking-widest opacity-80">Steps (with repeated quantities)</h3>
                    <button
                        onClick={onReadInstructions}
                        disabled={isMuted || (readingStatus === 'idle' && allStepsCompleted)}
                        className={`flex items-center gap-2 font-bold py-2 px-4 rounded-lg transition-all text-xs disabled:opacity-40 shadow-md ${
                            readingStatus === 'reading' 
                            ? 'bg-orange-600 hover:bg-orange-500 text-white' 
                            : readingStatus === 'paused'
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-accent hover:bg-indigo-500 text-white'
                        }`}
                    >
                        {readingStatus === 'reading' ? (
                            <>
                                <StopIcon className="w-4 h-4" />
                                <span>pause</span>
                            </>
                        ) : readingStatus === 'paused' ? (
                            <>
                                <PlayIcon className="w-4 h-4" />
                                <span>continue</span>
                            </>
                        ) : (
                            <>
                                <PlayIcon className="w-4 h-4" />
                                <span>read aloud</span>
                            </>
                        )}
                    </button>
                </div>
                <ol className="space-y-4">
                    {instructionSet.steps.map((step, index) => (
                        <li 
                            key={index} 
                            className={`flex items-start gap-4 p-4 rounded-xl transition-all border ${
                                completedSteps[index] 
                                ? 'bg-green-900/5 border-green-800/20 text-text-secondary italic line-through' 
                                : 'bg-primary/30 border-border-base shadow-sm'
                            }`}
                        >
                            <div className="flex-shrink-0 mt-1">
                                <input
                                    type="checkbox"
                                    id={`step-${index}`}
                                    checked={completedSteps[index] ?? false}
                                    onChange={() => onToggleStep(index)}
                                    className="h-5 w-5 rounded border-border-base bg-secondary text-accent focus:ring-accent cursor-pointer"
                                />
                            </div>
                            <label
                                htmlFor={`step-${index}`}
                                className="flex-1 text-sm md:text-base leading-relaxed cursor-pointer select-none"
                            >
                                <span className="font-bold mr-2 text-accent/70">{index + 1}.</span>
                                {step}
                            </label>
                        </li>
                    ))}
                </ol>
            </section>

            {/* Reference Section */}
            {hasSources && (
                <div className="mt-8 pt-6 border-t border-border-base">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Grounding Sources</p>
                    <div className="flex flex-wrap gap-2">
                        {instructionSet.sources!.map((source, index) => (
                            <a 
                                key={index} 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[11px] bg-primary/40 px-3 py-1.5 rounded-lg text-accent border border-accent/20 hover:bg-accent hover:text-white transition-all flex items-center gap-2"
                            >
                                <ExternalLinkIcon className="w-3 h-3" />
                                <span className="truncate max-w-[200px]">{source.title || 'Source'}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstructionDisplay;
