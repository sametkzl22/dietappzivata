'use client';

import { useState } from 'react';
import { RefreshCw, Flame, Beef, Wheat, Droplets, X, ChefHat } from 'lucide-react';

interface MealCardProps {
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    recipeName: string;
    calories: number;
    targetCalories: number;
    protein: number;
    carbs: number;
    fat: number;
    pantryScore?: number;
    onRegenerate?: () => void;
    isLoading?: boolean;
    ingredients?: string[];
    instructions?: string[];
    description?: string;
}

const mealTypeConfig = {
    breakfast: {
        emoji: '🌅',
        label: 'Breakfast',
        gradient: 'from-amber-400 to-orange-500',
        bgGradient: 'from-amber-50 to-orange-50',
    },
    lunch: {
        emoji: '☀️',
        label: 'Lunch',
        gradient: 'from-emerald-400 to-teal-500',
        bgGradient: 'from-emerald-50 to-teal-50',
    },
    dinner: {
        emoji: '🌙',
        label: 'Dinner',
        gradient: 'from-indigo-400 to-purple-500',
        bgGradient: 'from-indigo-50 to-purple-50',
    },
    snack: {
        emoji: '🍎',
        label: 'Snack',
        gradient: 'from-rose-400 to-pink-500',
        bgGradient: 'from-rose-50 to-pink-50',
    },
};

export default function MealCard({
    mealType,
    recipeName,
    calories,
    targetCalories,
    protein,
    carbs,
    fat,
    pantryScore,
    onRegenerate,
    isLoading = false,
    ingredients = [],
    instructions = [],
    description
}: MealCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const config = mealTypeConfig[mealType];
    const caloriePercentage = Math.round((calories / targetCalories) * 100);

    return (
        <>
            <div
                onClick={() => setIsModalOpen(true)}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.bgGradient} p-5 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer`}
            >
                {/* Background decoration */}
                <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${config.gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />

                {/* Header */}
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.emoji}</span>
                        <div>
                            <h3 className={`text-sm font-bold uppercase tracking-wide bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                                {config.label}
                            </h3>
                            <p className="text-xs text-slate-500">
                                Target: {Math.round(targetCalories)} kcal
                            </p>
                        </div>
                    </div>

                    {/* Regenerate button (Stop propagation to prevent modal open) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRegenerate?.();
                        }}
                        disabled={isLoading}
                        className={`rounded-xl bg-white/80 p-2.5 text-slate-500 shadow-sm backdrop-blur transition-all hover:bg-white hover:text-slate-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Regenerate meal"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Recipe Name */}
                <div className="relative mt-4">
                    <h4 className="text-lg font-semibold text-slate-800 line-clamp-2">
                        {recipeName || 'No recipe selected'}
                    </h4>

                    {/* Pantry Score Badge */}
                    {pantryScore !== undefined && pantryScore > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <span>🥗</span>
                            <span>{pantryScore}% pantry match</span>
                        </div>
                    )}
                </div>

                {/* Calories */}
                <div className="relative mt-4 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <span className="text-2xl font-bold text-slate-900">{calories}</span>
                    <span className="text-sm text-slate-500">kcal</span>
                    <span className={`ml-auto text-sm font-medium ${caloriePercentage >= 90 && caloriePercentage <= 110
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                        }`}>
                        {caloriePercentage}% of target
                    </span>
                </div>

                {/* Macros */}
                <div className="relative mt-4 grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-1.5 rounded-xl bg-white/60 px-3 py-2 backdrop-blur">
                        <Beef className="h-4 w-4 text-rose-500" />
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500">Protein</span>
                            <span className="text-sm font-semibold text-slate-800">{protein}g</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-xl bg-white/60 px-3 py-2 backdrop-blur">
                        <Wheat className="h-4 w-4 text-amber-500" />
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500">Carbs</span>
                            <span className="text-sm font-semibold text-slate-800">{carbs}g</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-xl bg-white/60 px-3 py-2 backdrop-blur">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500">Fat</span>
                            <span className="text-sm font-semibold text-slate-800">{fat}g</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recipe Detail Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-100 bg-white/95 backdrop-blur`}>
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{config.emoji}</span>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{recipeName}</h3>
                                    <p className="text-sm text-slate-500">{mealType.charAt(0).toUpperCase() + mealType.slice(1)} • {calories} kcal</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="h-6 w-6 text-slate-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-8">
                            {/* Description */}
                            {description && (
                                <p className="text-slate-600 text-lg leading-relaxed italic">
                                    "{description}"
                                </p>
                            )}

                            {/* Macros Row */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                                    <Beef className="h-6 w-6 text-rose-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-rose-700">{protein}g</p>
                                    <p className="text-xs font-semibold text-rose-400 uppercase">Protein</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                                    <Wheat className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-amber-700">{carbs}g</p>
                                    <p className="text-xs font-semibold text-amber-400 uppercase">Carbs</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                                    <Droplets className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-blue-700">{fat}g</p>
                                    <p className="text-xs font-semibold text-blue-400 uppercase">Fats</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Ingredients */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <ChefHat className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <h4 className="font-bold text-slate-900">Ingredients</h4>
                                    </div>
                                    {ingredients.length > 0 ? (
                                        <ul className="space-y-3">
                                            {ingredients.map((ing, i) => (
                                                <li key={i} className="flex items-start gap-3 text-slate-600">
                                                    <span className="h-1.5 w-1.5 mt-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                                    <span>{ing}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-slate-400 text-sm">No specific ingredients listed.</p>
                                    )}
                                </div>

                                {/* Instructions */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                            <Flame className="h-5 w-5 text-orange-600" />
                                        </div>
                                        <h4 className="font-bold text-slate-900">Instructions</h4>
                                    </div>
                                    {instructions.length > 0 ? (
                                        <ol className="space-y-4">
                                            {instructions.map((step, i) => (
                                                <li key={i} className="flex gap-4">
                                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                                                        {i + 1}
                                                    </span>
                                                    <p className="text-slate-600 leading-relaxed">{step}</p>
                                                </li>
                                            ))}
                                        </ol>
                                    ) : (
                                        <p className="text-slate-400 text-sm">No instructions available.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Skeleton Loader Component
export function MealCardSkeleton() {
    return (
        <div className="animate-pulse rounded-2xl bg-slate-100 p-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200" />
                    <div>
                        <div className="h-3 w-16 rounded bg-slate-200" />
                        <div className="mt-1 h-2 w-20 rounded bg-slate-200" />
                    </div>
                </div>
                <div className="h-9 w-9 rounded-xl bg-slate-200" />
            </div>

            <div className="mt-4">
                <div className="h-5 w-3/4 rounded bg-slate-200" />
                <div className="mt-2 h-5 w-12 rounded-full bg-slate-200" />
            </div>

            <div className="mt-4 flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-slate-200" />
                <div className="h-6 w-12 rounded bg-slate-200" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 rounded-xl bg-slate-200" />
                ))}
            </div>
        </div>
    );
}
