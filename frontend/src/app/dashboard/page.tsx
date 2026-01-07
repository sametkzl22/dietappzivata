'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Scale,
    Target,
    Flame,
    Activity,
    Calendar,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Utensils,
    ShoppingBag,
    X,
    Trash2,
    Check,
    Dumbbell,
    Home
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import MealCard, { MealCardSkeleton } from '@/components/MealCard';
import ExerciseCard from '@/components/ExerciseCard';
import CoachWidget from '@/components/CoachWidget';
import * as api from '@/lib/api';
import {
    type User,
    type HealthMetrics,
    type DietPlan,
    type DayPlan
} from '@/lib/api';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
    const [currentPlan, setCurrentPlan] = useState<DietPlan | null>(null);
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [planDuration, setPlanDuration] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [dietaryPreference, setDietaryPreference] = useState('Standard');
    const [workoutType, setWorkoutType] = useState('Gym');

    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showShoppingList, setShowShoppingList] = useState(false);

    // Tag Input State
    const [excludedItems, setExcludedItems] = useState<string[]>([]);
    const [ingredientInput, setIngredientInput] = useState("");

    const [includedItems, setIncludedItems] = useState<string[]>([]);
    const [includedInput, setIncludedInput] = useState("");

    const [isResetting, setIsResetting] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    // Fetch initial data
    useEffect(() => {
        async function fetchData() {
            if (!api.isAuthenticated()) {
                router.push('/login');
                return;
            }

            setIsLoading(true);

            try {
                // parallel fetch for user & health
                const [currentUser, planData] = await Promise.all([
                    api.getCurrentUser(),
                    api.getCurrentDietPlan()
                ]);

                if (!currentUser) {
                    router.push('/login');
                    return;
                }

                setUser(currentUser);

                // Fetch metrics separately as it relies on correct user state
                try {
                    const metrics = await api.getCurrentUserHealth();
                    setHealthMetrics(metrics);
                } catch (e) {
                    console.error("Health metrics fetch error:", e);
                }

                if (planData) {
                    setCurrentPlan(planData);
                    setPlanDuration(planData.duration as any);
                    setSelectedDayIndex(0);
                }

            } catch (err) {
                console.error('Failed to fetch dashboard data:', err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [router]);

    // Generate new plan
    const handleGeneratePlan = async () => {
        setIsGenerating(true);
        try {
            // Use the array state directly
            const newPlan = await api.generateDietPlan(
                planDuration,
                dietaryPreference === 'Standard' ? undefined : dietaryPreference,
                excludedItems,
                includedItems,
                workoutType
            );
            console.log("DEBUG API: Full Plan Response:", newPlan);
            if (newPlan && newPlan.plan_data && newPlan.plan_data.days) {
                console.log("DEBUG API: Day 1 Exercises:", newPlan.plan_data.days[0].exercises);
            }
            setCurrentPlan(newPlan);
            setSelectedDayIndex(0);
        } catch (error: any) {
            console.error(error);
            const msg = error?.message || "";
            if (msg.includes("429") || msg.toLowerCase().includes("resource exhausted")) {
                alert("⚠️ AI is busy (Rate Limit). Please wait a minute and try again.");
            } else {
                alert('Failed to generate plan. Please try again.');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>, list: string[], setList: (l: string[]) => void, inputVal: string, setInputVal: (s: string) => void) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = inputVal.trim();
            if (val && !list.includes(val)) {
                setList([...list, val]);
                setInputVal("");
            }
        }
    };

    const removeTag = (tagToRemove: string, list: string[], setList: (l: string[]) => void) => {
        setList(list.filter(tag => tag !== tagToRemove));
    };

    const confirmDelete = async () => {
        setIsResetting(true);
        try {
            await api.deleteCurrentPlan();
            setCurrentPlan(null);
            setSelectedDayIndex(0);
            setExcludedItems([]);
            setIngredientInput("");
            setIncludedItems([]);
            setIncludedInput("");
            setIsConfirmingDelete(false);
        } catch (error) {
            console.error("Failed to delete plan", error);
            alert("Failed to reset plan. Please check console.");
        } finally {
            setIsResetting(false);
        }
    };

    // Helper to get today's displayed day plan
    const getCurrentDayPlan = (): DayPlan | null => {
        if (!currentPlan?.plan_data?.days) return null;
        return currentPlan.plan_data.days[selectedDayIndex] || null;
    };

    const currentDay = getCurrentDayPlan();

    // Helper to parse "30g" to 30
    const parseMacro = (val: string | number) => {
        if (typeof val === 'number') return val;
        return parseInt(val.replace(/[^0-9]/g, '')) || 0;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
            {/* Header */}
            <header className="border-b border-slate-100 bg-white/80 backdrop-blur-lg sticky top-0 z-30">
                <div className="mx-auto max-w-7xl px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-200">
                                <Activity className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">NutriPlan</h1>
                                <p className="text-xs text-slate-500">Your Fitness Dashboard</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">
                {/* Welcome Section */}
                <section className="mb-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">
                                Hello, {user?.name || 'User'}! 👋
                            </h2>
                            <p className="mt-1 text-slate-500">
                                Goal: <span className="font-semibold text-emerald-600">
                                    {(user as any)?.target_weight_kg ? `${(user as any).target_weight_kg} kg target` : 'Healthy Living'}
                                </span>
                            </p>
                        </div>

                        {healthMetrics && (
                            <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2">
                                <Flame className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-700">
                                    TDEE: {Math.round(healthMetrics.tdee)} kcal
                                </span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Stats Grid */}
                <section className="mb-10">
                    <h3 className="mb-4 text-lg font-semibold text-slate-800">Your Health Metrics</h3>
                    {isLoading ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatsCard
                                icon={Scale}
                                label="Current Weight"
                                value={`${user?.weight_kg || 0} kg`}
                                subValue={(user as any)?.target_weight_kg ? `Goal: ${(user as any).target_weight_kg} kg` : 'No goal set'}
                                colorScheme="blue"
                            />
                            <StatsCard
                                icon={Flame}
                                label="Target Calories"
                                value={currentPlan?.plan_data?.target_calories_per_day || Math.round(healthMetrics?.tdee || 2000)}
                                subValue="Daily Target"
                                colorScheme="amber"
                            />
                            <StatsCard
                                icon={Target}
                                label="BMI Score"
                                value={healthMetrics?.bmi?.toFixed(1) || '--'}
                                subValue="Body Mass Index"
                                colorScheme="emerald"
                            />
                            <StatsCard
                                icon={Activity}
                                label="Body Fat %"
                                value={`${healthMetrics?.body_fat_percent?.toFixed(1) || '--'}%`}
                                subValue="Navy Method"
                                colorScheme="rose"
                            />
                        </div>
                    )}
                </section>

                {/* Meal Plan Controls */}
                <section className="mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">

                        {/* Title & Duration */}
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center min-w-fit">
                            <div className="flex items-center gap-2">
                                <Utensils className="h-5 w-5 text-emerald-600" />
                                <h2 className="text-xl font-bold text-slate-900">Meal Plan</h2>
                            </div>

                            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
                                {(['daily', 'weekly', 'monthly'] as const).map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setPlanDuration(d)}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${planDuration === d
                                            ? 'bg-white text-emerald-600 shadow-sm'
                                            : 'text-slate-500 hover:text-emerald-500'
                                            }`}
                                    >
                                        {d.charAt(0).toUpperCase() + d.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Middle Controls: Prefs + Tags + Workout Type */}
                        <div className="flex flex-col lg:flex-row gap-4 w-full">

                            {/* Preferences & Tags */}
                            <div className="flex flex-col sm:flex-row gap-4 w-full">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-700 whitespace-nowrap text-sm">Pref:</span>
                                    <select
                                        value={dietaryPreference}
                                        onChange={(e) => setDietaryPreference(e.target.value)}
                                        className="block w-full sm:w-32 rounded-lg border-slate-200 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500 bg-slate-50"
                                    >
                                        <option value="Standard">None</option>
                                        <option value="Vegan">Vegan</option>
                                        <option value="Vegetarian">Vegetarian</option>
                                        <option value="Keto">Keto</option>
                                        <option value="Paleo">Paleo</option>
                                        <option value="Gluten-Free">Gluten-Free</option>
                                        <option value="High Protein">High Protein</option>
                                        <option value="Mediterranean">Mediterranean</option>
                                    </select>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 w-full">
                                    {/* Included */}
                                    <div className="flex flex-wrap items-center gap-2 flex-1">
                                        <span className="font-semibold text-slate-700 whitespace-nowrap text-sm">✅ Incl:</span>
                                        <input
                                            type="text"
                                            value={includedInput}
                                            onChange={(e) => setIncludedInput(e.target.value)}
                                            onKeyDown={(e) => handleAddTag(e, includedItems, setIncludedItems, includedInput, setIncludedInput)}
                                            placeholder="Available..."
                                            className="block w-full min-w-[100px] rounded-lg border-emerald-200 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500 bg-emerald-50/30"
                                        />
                                        {includedItems.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                {tag}
                                                <button onClick={() => removeTag(tag, includedItems, setIncludedItems)} className="hover:text-emerald-900"><X className="h-3 w-3" /></button>
                                            </span>
                                        ))}
                                    </div>

                                    {/* Excluded */}
                                    <div className="flex flex-wrap items-center gap-2 flex-1">
                                        <span className="font-semibold text-slate-700 whitespace-nowrap text-sm">⛔ Excl:</span>
                                        <input
                                            type="text"
                                            value={ingredientInput}
                                            onChange={(e) => setIngredientInput(e.target.value)}
                                            onKeyDown={(e) => handleAddTag(e, excludedItems, setExcludedItems, ingredientInput, setIngredientInput)}
                                            placeholder="Allergic..."
                                            className="block w-full min-w-[100px] rounded-lg border-red-200 py-1.5 text-sm focus:border-red-500 focus:ring-red-500 bg-red-50/30"
                                        />
                                        {excludedItems.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                                {tag}
                                                <button onClick={() => removeTag(tag, excludedItems, setExcludedItems)} className="hover:text-red-900"><X className="h-3 w-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Workout Type Toggle */}
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl min-w-fit self-start lg:self-auto">
                                <button
                                    onClick={() => setWorkoutType('Gym')}
                                    className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${workoutType === 'Gym'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Dumbbell className="h-4 w-4" />
                                    Gym
                                </button>
                                <button
                                    onClick={() => setWorkoutType('Home')}
                                    className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${workoutType === 'Home'
                                        ? 'bg-white text-emerald-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Home className="h-4 w-4" />
                                    Home
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 w-full xl:w-auto mt-4 xl:mt-0">
                            {currentPlan && (
                                isConfirmingDelete ? (
                                    <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-xl px-2 py-1.5 animate-in fade-in zoom-in duration-200">
                                        <button onClick={confirmDelete} disabled={isResetting} className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                            {isResetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                        </button>
                                        <button onClick={() => setIsConfirmingDelete(false)} disabled={isResetting} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsConfirmingDelete(true)}
                                        className="p-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-all"
                                        title="Delete Plan"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )
                            )}

                            {currentPlan?.plan_data?.shopping_list && currentPlan.plan_data.shopping_list.length > 0 && (
                                <button
                                    onClick={() => setShowShoppingList(true)}
                                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-all font-medium text-sm"
                                >
                                    <ShoppingBag className="h-4 w-4" />
                                    List
                                </button>
                            )}

                            <button
                                onClick={handleGeneratePlan}
                                disabled={isGenerating}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-emerald-500 text-white px-6 py-2.5 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200/50 disabled:opacity-70 disabled:cursor-not-allowed font-medium text-sm"
                            >
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                                {isGenerating ? 'Generating...' : 'Generate Plan'}
                            </button>
                        </div>
                    </div>
                </section>

                <div className="flex flex-col gap-8">
                    {/* Shopping List Modal */}
                    {showShoppingList && currentPlan?.plan_data?.shopping_list && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
                                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <ShoppingBag className="h-5 w-5" />
                                        <h3 className="font-bold text-lg text-slate-900">Monthly Shopping List</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowShoppingList(false)}
                                        className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="p-4 overflow-y-auto">
                                    <div className="p-4 bg-emerald-50 rounded-xl mb-4 text-sm text-emerald-700">
                                        This master list covers all ingredients needed for your 28-day monthly plan. Buy in bulk to save costs!
                                    </div>
                                    <ul className="space-y-2">
                                        {currentPlan.plan_data.shopping_list.map((item, idx) => (
                                            <li key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                                                <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                                                <span className="text-slate-700 capitalize">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                                    <button
                                        onClick={() => setShowShoppingList(false)}
                                        className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Day Navigation (Slider) */}
                    {currentPlan?.plan_data?.days && currentPlan.plan_data.days.length > 1 && (
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={() => setSelectedDayIndex(Math.max(0, selectedDayIndex - 1))}
                                disabled={selectedDayIndex === 0}
                                className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                <ChevronLeft className="h-6 w-6 text-slate-600" />
                            </button>

                            <div className="text-center px-4 min-w-[120px]">
                                <h3 className="text-lg font-bold text-slate-800">
                                    {currentDay?.day_label || `Day ${selectedDayIndex + 1}`}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {currentDay?.total_calories} kcal
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedDayIndex(Math.min(currentPlan.plan_data.days.length - 1, selectedDayIndex + 1))}
                                disabled={selectedDayIndex === currentPlan.plan_data.days.length - 1}
                                className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                <ChevronRight className="h-6 w-6 text-slate-600" />
                            </button>
                        </div>
                    )}

                    {/* Meal Cards */}
                    <section>
                        {isLoading ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {[1, 2, 3, 4].map((i) => <MealCardSkeleton key={i} />)}
                            </div>
                        ) : !currentDay ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
                                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                    <Utensils className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">No active meal plan</h3>
                                <p className="text-slate-500 max-w-md mx-auto mt-2">
                                    Select a duration above and click "Generate" to create your personalized nutrition plan.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: Nutrition (2/3 width) */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                            <Utensils className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">Nutrition Plan</h3>
                                    </div>
                                    <div className="grid gap-6">
                                        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
                                            const meal = currentDay.meals[type];
                                            if (!meal) return null;

                                            return (
                                                <MealCard
                                                    key={type}
                                                    mealType={type}
                                                    recipeName={meal.name}
                                                    calories={meal.calories}
                                                    targetCalories={meal.calories}
                                                    protein={parseMacro(meal.protein)}
                                                    carbs={parseMacro(meal.carbs)}
                                                    fat={parseMacro(meal.fat)}
                                                    description={meal.description}
                                                    ingredients={meal.ingredients}
                                                    instructions={meal.instructions}
                                                    onRegenerate={() => { }}
                                                    isLoading={false}
                                                    pantryScore={planDuration === 'daily' || planDuration === 'weekly' ? 100 : undefined}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Column: Fitness (1/3 width) */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Dumbbell className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">Workout Plan</h3>
                                    </div>

                                    <div className="space-y-4">
                                        {currentDay.exercises && currentDay.exercises.length > 0 ? (
                                            <div className="grid gap-4">
                                                {currentDay.exercises.map((exercise, idx) => (
                                                    <ExerciseCard key={idx} exercise={exercise} />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center text-slate-500 italic">
                                                <p className="font-medium">Rest Day / Active Recovery</p>
                                                <p className="text-xs mt-1">Go for a light walk or stretch.</p>
                                            </div>
                                        )}

                                        {/* Daily Tip Card if exists */}
                                        {currentDay.daily_tip && (
                                            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4">
                                                <h4 className="font-bold text-violet-800 text-sm mb-2 flex items-center gap-2">
                                                    <Flame className="h-4 w-4" />
                                                    Daily Coach Tip
                                                </h4>
                                                <p className="text-sm text-violet-700 leading-relaxed">
                                                    {currentDay.daily_tip}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

            </main>

            {/* AI Coach Widget */}
            <CoachWidget userId={user?.id} />
        </div>
    );
}
