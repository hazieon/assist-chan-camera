import React, { useState } from 'react';
import { InstructionSet } from '../types';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { LeafIcon } from './icons/LeafIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { UndoIcon } from './icons/UndoIcon';
import { ClockIcon } from './icons/ClockIcon';
import { FireIcon } from './icons/FireIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ChevronDownIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

const getIngredientEmoji = (item: string): string => {
    const lower = item.toLowerCase();
    
    // Clean up numbers, measurements, and prepositions to isolate the food
    const cleanItem = lower
        .replace(/[0-9./¼½¾]+/g, '') // numbers and fractions
        .replace(/\b(cups?|cups? of|tbsps?|tsps?|tablespoons?|teaspoons?|grams?|g|ml|liters?|oz|ounces?|pounds?|lbs?|packages?|cans?|bottles?|cloves?|pinches?|dashes?|handfuls?|sprigs?|heads?|stalks?|slices?|pieces?|cloves?|tazas?|cucharadas?|cucharaditas?|gramos?|litros?|onzas?|libras?|paquetes?|latas?|botellas?|dientes?|pizcas?|tasses?|cuillères?|grammes?|onces?|livres?|paquets?|boîtes?|tazze?|cucchiai?|grammi?|once?|libbre?|pacchi?|lattine?|tassen?|löffel?|gramm?|unzen?|pfund?|pakete?|dosen?|flaschen?|extra|large|small|medium|fresh|dried|ground|minced|chopped|diced|sliced|peeled|toasted|warm|cold|of|de|da|von|vanilla|vanille|vainilla)\b/g, '')
        .trim();

    const isMatch = (words: string[]) => {
        // Create regex that handles common plurals: s, es, ies
        const patterns = words.map(w => {
            if (w.endsWith('y')) {
                return `${w.slice(0, -1)}(y|ies)`;
            }
            if (w.endsWith('s') || w.endsWith('z') || w.endsWith('ch') || w.endsWith('sh')) {
                return `${w}(es)?`;
            }
            return `${w}s?`;
        });
        const regex = new RegExp(`\\b(${patterns.join('|')})\\b`, 'i');
        return regex.test(cleanItem);
    };

    // Mapping with plural and multilingual support
    // Dairy/Baking
    if (isMatch(['butter', 'mantequilla', 'beurre', 'burro'])) return '🧈';
    if (isMatch(['flour', 'harina', 'farine', 'mehl'])) return '🌾';
    if (isMatch(['sugar', 'azúcar', 'sucre', 'zucchero', 'zucker'])) return '🍬';
    if (isMatch(['salt', 'sal', 'sel', 'sale', 'salz'])) return '🧂';
    if (isMatch(['milk', 'leche', 'lait', 'latte', 'milch', 'cream', 'crema', 'crème', 'sahne'])) return '🥛';
    if (isMatch(['egg', 'huevo', 'oeuf', 'uovo', 'ei'])) return '🥚';
    if (isMatch(['water', 'agua', 'eau', 'acqua', 'wasser', 'oil', 'aceite', 'huile', 'olio', 'öl'])) return '💧';

    // Meat/Protien
    if (isMatch(['chicken', 'pollo', 'poulet', 'hähnchen'])) return '🍗';
    if (isMatch(['beef', 'carne', 'manzo', 'fleisch', 'steak', 'bistec'])) return '🥩';
    if (isMatch(['pork', 'cerdo', 'porc', 'maiale', 'schwein', 'bacon', 'tocino'])) return '🥓';
    if (isMatch(['shrimp', 'camarón', 'crevette', 'gamberetto', 'garnele', 'prawn'])) return '🍤';
    if (isMatch(['fish', 'pescado', 'poisson', 'pesce', 'fisch', 'salmon', 'saumon', 'tuna', 'atún', 'thon', 'tonno', 'thunfisch'])) return '🐟';

    // Veggies
    if (isMatch(['garlic', 'ajo', 'ail', 'aglio', 'knoblauch'])) return '🧄';
    if (isMatch(['onion', 'cebolla', 'oignon', 'cipolla', 'zwiebel'])) return '🧅';
    if (isMatch(['tomato', 'tomate', 'pomodoro'])) return '🍅';
    if (isMatch(['potato', 'patata', 'pomme de terre', 'kartoffel'])) return '🥔';
    if (isMatch(['carrot', 'zanahoria', 'carotte', 'carota', 'karotte'])) return '🥕';
    if (isMatch(['pepper', 'pimienta', 'pimiento', 'poivre', 'poivron', 'pepe', 'peperoncino', 'pfeffer', 'paprika', 'chili', 'capsicum'])) return '🌶️';
    if (isMatch(['broccoli', 'brécol', 'broccolo'])) return '🥦';
    if (isMatch(['corn', 'maíz', 'maïs', 'mais'])) return '🌽';
    if (isMatch(['mushroom', 'champiñón', 'champignon', 'fungo', 'pilz'])) return '🍄';
    if (isMatch(['cucumber', 'pepino', 'concombre', 'cetriolo', 'gurke'])) return '🥒';
    if (isMatch(['avocado', 'aguacate', 'avocat', 'avocado'])) return '🥑';
    if (isMatch(['eggplant', 'berenjena', 'aubergine', 'melanzana'])) return '🍆';
    if (isMatch(['spinach', 'espinaca', 'épinard', 'spinaci', 'lettuce', 'lechuga', 'laitue', 'lattuga', 'salat', 'kale', 'col', 'chou', 'cavolo', 'kohl'])) return '🥬';

    // Fruits
    if (isMatch(['apple', 'manzana', 'pomme', 'mela', 'apfel'])) return '🍎';
    if (isMatch(['grape', 'uva', 'raisin', 'traube'])) return '🍇';
    if (isMatch(['strawberry', 'fresa', 'fraise', 'fragola', 'erdbeere'])) return '🍓';
    if (isMatch(['blueberry', 'arándano', 'myrtille', 'mirtillo', 'blaubeere', 'berry', 'baya', 'beere'])) return '🫐';
    if (isMatch(['cherry', 'cereza', 'cerise', 'ciliegia', 'kirsche'])) return '🍒';
    if (isMatch(['peach', 'durazno', 'melocotón', 'pêche', 'pesca', 'pfirsich'])) return '🍑';
    if (isMatch(['pear', 'pera', 'poire', 'birne'])) return '🍐';
    if (isMatch(['mango', 'manga'])) return '🥭';
    if (isMatch(['pineapple', 'piña', 'ananas'])) return '🍍';
    if (isMatch(['watermelon', 'sandía', 'pastèque', 'anguria', 'wassermelone'])) return '🍉';
    if (isMatch(['banana', 'plátano', 'banane'])) return '🍌';
    if (isMatch(['fruit', 'fruta', 'frutta', 'obst'])) return '🍎';
    
    // Citrus - User reports double emoji (lime + green heart) because of Emoji 15.1 ZWJ sequence
    // Use lemon emoji for both to ensure 1-emoji limit and chrome compatibility
    if (isMatch(['lemon', 'limón', 'citron', 'limone', 'zitrone', 'lime', 'lima'])) return '🍋';
    if (isMatch(['orange', 'naranja', 'arancia'])) return '🍊';

    // Grains/Others
    if (isMatch(['pasta', 'noodle', 'nudel', 'espagueti', 'spaghetti'])) return '🍝';
    if (isMatch(['rice', 'arroz', 'riz', 'riso', 'reis'])) return '🍚';
    if (isMatch(['cheese', 'queso', 'fromage', 'formaggio', 'käse'])) return '🧀';
    if (isMatch(['bread', 'pan', 'pain', 'pane', 'brot', 'yeast', 'levadura', 'levure', 'lievito', 'hefe'])) return '🍞';
    if (isMatch(['honey', 'miel', 'miele', 'honig', 'syrup', 'jarabe', 'sirop', 'sciroppo', 'sirup', 'jam', 'mermelada', 'confiture', 'marmellata', 'konfitüre'])) return '🍯';
    if (isMatch(['nut', 'nuez', 'noix', 'nocciola', 'nuss', 'almond', 'almendra', 'amande', 'mandel', 'walnut', 'peanut', 'cacahuete', 'cacahouète', 'erdnuss'])) return '🥜';
    if (isMatch(['chocolate', 'cioccolato', 'schokolade', 'cocoa', 'cacao'])) return '🍫';
    if (isMatch(['wine', 'vino', 'vin', 'wein', 'beer', 'cerveza', 'bière', 'birra', 'bier'])) return '🍷';
    if (isMatch(['coffee', 'café', 'caffè', 'kaffee', 'tea', 'té', 'thé', 'tè', 'tee'])) return '☕';

    // Herbs
    if (isMatch(['herb', 'hierba', 'herbe', 'erba', 'kräuter', 'parsley', 'perejil', 'persil', 'prezzemolo', 'petersilie', 'basil', 'albahaca', 'basilic', 'basilico', 'basilikum', 'cilantro', 'coriander', 'coriandre', 'koriander', 'mint', 'menta', 'menthe', 'zecca', 'minze', 'rosemary', 'romero', 'romarin', 'rosmarino', 'rosmarin', 'thyme', 'tomillo', 'thym', 'timo', 'thymian', 'oregano', 'orégano', 'origan', 'origano'])) return '🌿';


    // Default soup/bowl for liquid bases
    if (lower.includes('broth') || lower.includes('stock') || lower.includes('soup') || lower.includes('caldo') || lower.includes('bouillon')) return '🥣';

    return '🥣'; // Default
};

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
    onModify
}) => {
    const [isMaterialsOpen, setIsMaterialsOpen] = useState(true);
    const [isActionsOpen, setIsActionsOpen] = useState(true);
    const [isStepsOpen, setIsStepsOpen] = useState(true);
    const [isSourcesOpen, setIsSourcesOpen] = useState(true);

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
                    
                    {/* Primary Source Link - Always below title */}
                    {hasSources ? (
                        <div className="pt-1 flex flex-wrap gap-x-4 gap-y-2">
                            <a 
                                href={instructionSet.sources![0].uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-accent hover:text-accent/80 text-xs font-bold transition-all group"
                            >
                                <ExternalLinkIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                <span className="underline underline-offset-4 decoration-accent/30 group-hover:decoration-accent">
                                    Source: {instructionSet.sources![0].title || 'Original Page'}
                                </span>
                            </a>
                        </div>
                    ) : isKeywordSearch && (
                        <div className="pt-1">
                            <a 
                                href={`https://www.google.com/search?q=${encodeURIComponent(instructionSet.title)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-accent hover:text-accent/80 text-xs font-bold transition-all group"
                            >
                                <ExternalLinkIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                <span className="underline underline-offset-4 decoration-accent/30 group-hover:decoration-accent">
                                    Search on Google
                                </span>
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
                </div>
            </div>

            {/* Materials Section */}
            {hasMaterials && (
                <section className="mb-8 border-t border-gray-200 dark:border-gray-800 pt-8">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <button 
                            onClick={() => setIsMaterialsOpen(!isMaterialsOpen)}
                            className="flex items-center gap-2 group cursor-pointer"
                        >
                            <h3 className="text-xl sm:text-2xl font-black text-text-primary uppercase tracking-tight">MATERIALS</h3>
                            <ChevronDownIcon className={`w-5 h-5 text-accent/50 group-hover:text-accent transition-transform duration-300 ${isMaterialsOpen ? '' : '-rotate-90'}`} />
                        </button>
                        <div className="flex gap-2">
                        {isReadingMaterials ? (
                            <button
                                onClick={onStopReading}
                                className="flex items-center gap-2 bg-[#A291D4] dark:bg-accent/70 text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 active:scale-95 transition-all text-xs touch-manipulation shadow-md"
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
                    </div>
                    <AnimatePresence>
                        {isMaterialsOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm md:text-base text-text-secondary pt-2">
                                    {instructionSet.materials.map((material, index) => (
                                        <li key={index} className="flex items-start gap-3 bg-primary/20 p-3 rounded-lg">
                                            <span className="text-xl shrink-0" role="img" aria-label="ingredient icon">
                                                {getIngredientEmoji(material)}
                                            </span>
                                            <span>{material}</span>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>
            )}

            {/* Quick Actions Section */}
            {!isCookingMode && (
                <div className="mb-8 border-t border-gray-200 dark:border-gray-800 pt-8">
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                        <button 
                            onClick={() => setIsActionsOpen(!isActionsOpen)}
                            className="flex items-center gap-2 group cursor-pointer"
                        >
                            <h3 className="text-xl sm:text-2xl font-black text-text-primary uppercase tracking-tight">QUICK ACTIONS</h3>
                            <ChevronDownIcon className={`w-5 h-5 text-accent/50 group-hover:text-accent transition-transform duration-300 ${isActionsOpen ? '' : '-rotate-90'}`} />
                        </button>
                        {showEcoButton && (
                            isEcoApplied ? (
                                <button
                                    onClick={onRevert}
                                    disabled={isModifying}
                                    className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white font-bold py-2 px-4 rounded-lg transition-all h-[40px] text-xs shadow-md touch-manipulation disabled:opacity-50 disabled:active:scale-100"
                                >
                                    <UndoIcon className="w-3.5 h-3.5" />
                                    <span>Original</span>
                                </button>
                            ) : (
                                <button
                                    onClick={onEcoSwitch}
                                    disabled={isModifying}
                                    className="flex items-center justify-center gap-2 bg-eco hover:bg-eco/90 active:scale-95 text-gray-900 font-bold py-2 px-4 rounded-lg transition-all h-[40px] text-xs shadow-md touch-manipulation disabled:opacity-50 disabled:active:scale-100"
                                    title="Switch to eco version"
                                >
                                    <LeafIcon className="w-4 h-4 text-gray-900 animate-pulse" />
                                    <span>eco version</span>
                                </button>
                            )
                        )}
                    </div>
                    <AnimatePresence>
                        {isActionsOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <div className="pt-2">
                                    <ActionButtons 
                                        onModify={onModify} 
                                        disabled={isModifying}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Instructions Section */}
            <section className="border-t border-gray-200 dark:border-gray-800 pt-8">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <button 
                        onClick={() => setIsStepsOpen(!isStepsOpen)}
                        className="flex items-center gap-2 group cursor-pointer"
                    >
                        <h3 className="text-xl sm:text-2xl font-black text-text-primary uppercase tracking-tight">STEPS</h3>
                        <ChevronDownIcon className={`w-5 h-5 text-accent/50 group-hover:text-accent transition-transform duration-300 ${isStepsOpen ? '' : '-rotate-90'}`} />
                    </button>
                    <button
                        onClick={onReadInstructions}
                        disabled={isMuted || (readingStatus === 'idle' && allStepsCompleted)}
                        className={`flex items-center gap-2 font-bold py-2 px-4 rounded-lg active:scale-95 transition-all text-xs disabled:opacity-40 disabled:active:scale-100 shadow-md touch-manipulation ${
                            readingStatus === 'reading' 
                            ? 'bg-[#A291D4] dark:bg-accent/70 hover:opacity-90 text-white' 
                            : readingStatus === 'paused'
                            ? 'bg-[#A291D4]/70 dark:bg-accent/50 hover:opacity-90 text-white'
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
                <AnimatePresence>
                    {isStepsOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <ol className="space-y-4 pt-2">
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {/* Reference Section - Always show if sources exist */}
            {instructionSet.sources && instructionSet.sources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <button 
                        onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                        className="flex items-center gap-2 group cursor-pointer mb-3"
                    >
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none">
                            {instructionSet.sources.length > 1 ? 'All Sources' : 'Source'}
                        </p>
                        <ChevronDownIcon className={`w-3 h-3 text-accent/50 group-hover:text-accent transition-transform duration-300 ${isSourcesOpen ? '' : '-rotate-90'}`} />
                    </button>
                    <AnimatePresence>
                        {isSourcesOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {instructionSet.sources.map((source, index) => (
                                        <a 
                                            key={index} 
                                            href={source.uri} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-[11px] bg-primary/40 px-3 py-1.5 rounded-lg text-accent hover:bg-accent hover:text-white transition-all flex items-center gap-2 border border-gray-300 dark:border-transparent group"
                                        >
                                            <ExternalLinkIcon className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                            <span className="truncate max-w-[250px]">{source.title || 'View Webpage'}</span>
                                        </a>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default InstructionDisplay;
