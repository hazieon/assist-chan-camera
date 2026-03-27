
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

import ActionButtons from './ActionButtons';

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
    isCookingMode: boolean;
    isKeywordSearch?: boolean;
    onRegenerate?: () => void;
    onModify: (prompt: string, summary: string) => void;
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
    isEcoApplied,
    isCookingMode,
    isKeywordSearch,
    onRegenerate,
    onModify
}) => {
    const allStepsCompleted = completedSteps.length > 0 && completedSteps.every(Boolean);
    const showEcoButton = !!instructionSet.isFood && instructionSet.materials.length > 0;
    const hasSources = instructionSet.sources && instructionSet.sources.length > 0;
    const hasMaterials = instructionSet.materials && instructionSet.materials.length > 0;
    const completedCount = completedSteps.filter(Boolean).length;
    const totalCount = instructionSet.steps.length;

    return (
        <div className="bg-secondary p-5 md:p-6 rounded-xl shadow-lg animate-fade-in border border-gray-300 dark:border-transparent">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 pb-6">
                <div className="flex-grow space-y-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-text-primary">
                            {instructionSet.title}
                        </h2>
                        {isCookingMode && totalCount > 0 && (
                            <span className="shrink-0 bg-accent/10 text-accent text-[10px] font-bold px-2 py-1 rounded font-mono">
                                {completedCount}/{totalCount}
                            </span>
                        )}
                    </div>

                    {/* Quick Metadata */}
                    {(instructionSet.cookingTime || instructionSet.ovenTemp || instructionSet.expiryDate) && (
                        <div className="flex flex-wrap gap-3 pt-1">
                            {instructionSet.cookingTime && (
                                <div className="flex items-center gap-2 bg-primary/50 px-3 py-1.5 rounded-lg text-xs">
                                    <ClockIcon className="w-3.5 h-3.5 text-accent" />
                                    <span>{instructionSet.cookingTime}</span>
                                </div>
                            )}
                            {instructionSet.ovenTemp && (
                                <div className="flex items-center gap-2 bg-primary/50 px-3 py-1.5 rounded-lg text-xs">
                                    <FireIcon className="w-3.5 h-3.5 text-accent" />
                                    <span>{instructionSet.ovenTemp}</span>
                                </div>
                            )}
                            {instructionSet.expiryDate && (
                                <div className="flex items-center gap-2 bg-error/10 px-3 py-1.5 rounded-lg text-xs text-error">
                                    <CalendarIcon className="w-3.5 h-3.5 text-error" />
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
                                className="inline-flex items-center gap-2 text-accent hover:text-accent/80 text-sm font-bold underline underline-offset-4 decoration-accent/30 transition-all"
                            >
                                <ExternalLinkIcon className="w-4 h-4" />
                                <span>Visit Source Page</span>
                            </a>
                        </div>
                    )}
                </div>
                
                {/* Secondary Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                        onClick={onStartCooking}
                        disabled={isModifying}
                        className="flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 active:scale-95 text-white font-bold py-2 px-6 rounded-lg transition-all h-[44px] text-sm shadow-lg touch-manipulation disabled:active:scale-100 w-full sm:w-auto"
                    >
                        <PlayIcon className="w-4 h-4" />
                        <span>START</span>
                    </button>
                    {showEcoButton && (
                        isEcoApplied ? (
                            <button
                                onClick={onRevert}
                                disabled={isModifying}
                                className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white font-bold py-2 px-4 rounded-lg transition-all h-[44px] text-sm shadow-md touch-manipulation disabled:active:scale-100 w-full sm:w-auto"
                            >
                                <UndoIcon className="w-4 h-4" />
                                <span>Original</span>
                            </button>
                        ) : (
                            <button
                                onClick={onEcoSwitch}
                                disabled={isModifying}
                                className="flex items-center justify-center gap-2 bg-eco hover:bg-eco/90 active:scale-95 text-gray-900 font-bold py-2 px-4 rounded-lg transition-all h-[44px] text-sm shadow-md touch-manipulation disabled:active:scale-100 w-full sm:w-auto"
                                title="Switch to eco version"
                            >
                                <LeafIcon className="w-5 h-5 text-gray-900 animate-pulse" />
                                <span>eco version</span>
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Materials Section */}
            {hasMaterials && (
                <section className="mb-8 border-t border-gray-200 dark:border-gray-800 pt-8">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <h3 className="text-xl sm:text-2xl font-black text-text-primary uppercase tracking-tight">MATERIALS</h3>
                        {isReadingMaterials ? (
                            <button
                                onClick={onStopReading}
                                className="flex items-center gap-2 bg-accent/70 text-white font-bold py-2 px-4 rounded-lg hover:bg-accent active:scale-95 transition-all text-xs touch-manipulation shadow-md"
                            >
                                <StopIcon className="w-4 h-4" />
                                Stop Reading
                            </button>
                        ) : (
                            <button
                                onClick={onReadMaterials}
                                disabled={isMuted}
                                className="flex items-center gap-2 bg-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-accent/90 active:scale-95 transition-all text-xs disabled:opacity-40 disabled:active:scale-100 shadow-md touch-manipulation"
                            >
                                <PlayIcon className="w-4 h-4" />
                                Read aloud
                            </button>
                        )}
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm md:text-base text-text-secondary">
                        {instructionSet.materials.map((material, index) => (
                            <li key={index} className="flex items-start gap-3 bg-primary/20 p-3 rounded-lg">
                                <span className="text-accent font-bold">•</span> {material}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Quick Actions Section - Moved here */}
            {!isCookingMode && (
                <div className="mb-8 border-t border-gray-200 dark:border-gray-800 pt-8">
                    <h3 className="text-xl sm:text-2xl font-black text-text-primary uppercase tracking-tight mb-6">QUICK ACTIONS</h3>
                    <ActionButtons onModify={onModify} disabled={isModifying} />
                </div>
            )}

            {/* Instructions Section */}
            <section className="border-t border-gray-200 dark:border-gray-800 pt-8">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <h3 className="text-xl sm:text-2xl font-black text-text-primary uppercase tracking-tight">STEPS</h3>
                    <button
                        onClick={onReadInstructions}
                        disabled={isMuted || (readingStatus === 'idle' && allStepsCompleted)}
                        className={`flex items-center gap-2 font-bold py-2 px-4 rounded-lg active:scale-95 transition-all text-xs disabled:opacity-40 disabled:active:scale-100 shadow-md touch-manipulation ${
                            readingStatus === 'reading' 
                            ? 'bg-accent/70 hover:bg-accent text-white' 
                            : readingStatus === 'paused'
                            ? 'bg-accent/50 hover:bg-accent text-white'
                            : 'bg-accent hover:bg-accent/90 text-white'
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
                                <span>Read aloud</span>
                            </>
                        )}
                    </button>
                </div>
                <ol className="space-y-4">
                    {instructionSet.steps.map((step, index) => (
                        <li 
                            key={index} 
                            className={`flex items-start gap-4 p-4 rounded-lg transition-all border border-gray-300 dark:border-transparent shadow-md dark:shadow-sm ${
                                completedSteps[index] 
                                ? 'bg-green-900/5 text-text-secondary italic line-through' 
                                : 'bg-primary/30'
                            }`}
                        >
                            <div className="flex-shrink-0 mt-1">
                                <input
                                    type="checkbox"
                                    id={`step-${index}`}
                                    checked={completedSteps[index] ?? false}
                                    onChange={() => onToggleStep(index)}
                                    className="h-6 w-6 rounded bg-secondary text-accent focus:ring-accent cursor-pointer border-none"
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
                <div className="mt-8 pt-6">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Sources</p>
                    <div className="flex flex-wrap gap-2">
                        {instructionSet.sources!.map((source, index) => (
                            <a 
                                key={index} 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[11px] bg-primary/40 px-3 py-1.5 rounded-lg text-accent hover:bg-accent hover:text-white transition-all flex items-center gap-2"
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
