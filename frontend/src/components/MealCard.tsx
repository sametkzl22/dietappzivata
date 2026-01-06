'use client';

import { RefreshCw, Flame, Beef, Wheat, Droplets } from 'lucide-react';

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
}: MealCardProps) {
    const config = mealTypeConfig[mealType];
    const caloriePercentage = Math.round((calories / targetCalories) * 100);

    return (
        <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.bgGradient} p-5 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]`}>
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

                {/* Regenerate button */}
                <button
                    onClick={onRegenerate}
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
