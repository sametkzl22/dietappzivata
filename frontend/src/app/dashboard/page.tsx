'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Scale,
    Target,
    Flame,
    Activity,
    Calendar,
    ArrowRight,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Utensils
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import MealCard, { MealCardSkeleton } from '@/components/MealCard';
import CoachWidget from '@/components/CoachWidget';
import {
    getCurrentUser,
    getCurrentUserHealth,
    generateDietPlan,
    getCurrentDietPlan,
    isAuthenticated,
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

    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch initial data
    useEffect(() => {
        async function fetchData() {
            if (!isAuthenticated()) {
                router.push('/login');
                return;
            }

            setIsLoading(true);

            try {
                // parallel fetch for user & health
                const [currentUser, planData] = await Promise.all([
                    getCurrentUser(),
                    getCurrentDietPlan()
                ]);

                if (!currentUser) {
                    router.push('/login');
                    return;
                }

                setUser(currentUser);

                // Fetch metrics separately as it relies on correct user state
                try {
                    const metrics = await getCurrentUserHealth();
                    setHealthMetrics(metrics);
                } catch (e) {
                    console.error("Health metrics fetch error:", e);
                }

                if (planData) {
                    setCurrentPlan(planData);
                    setPlanDuration(planData.duration);
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
            const newPlan = await generateDietPlan(planDuration);
            setCurrentPlan(newPlan);
            setSelectedDayIndex(0);
        } catch (err) {
            console.error('Failed to generate plan:', err);
            alert('Failed to generate plan. Please try again.');
        } finally {
            setIsGenerating(false);
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
                <section className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2">
                        <Utensils className="h-5 w-5 text-emerald-600" />
                        <span className="font-semibold text-slate-700">Plan Duration:</span>
                        <div className="flex bg-slate-100 rounded-lg p-1">
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

                    <button
                        onClick={handleGeneratePlan}
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200/50 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                        {isGenerating ? 'Generating...' : `Generate ${planDuration} Plan`}
                    </button>
                </section>

                {/* Day Navigation (Slider) */}
                {currentPlan?.plan_data?.days && currentPlan.plan_data.days.length > 1 && (
                    <div className="mb-8 flex items-center justify-center gap-4">
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
                <section className="mb-10">
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
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
                                const meal = currentDay.meals[type];
                                if (!meal) return null;

                                return (
                                    <MealCard
                                        key={type}
                                        mealType={type}
                                        recipeName={meal.name}
                                        calories={meal.calories}
                                        targetCalories={meal.calories} // Target is roughly what was generated
                                        protein={parseMacro(meal.protein)}
                                        carbs={parseMacro(meal.carbs)}
                                        fat={parseMacro(meal.fat)}
                                        onRegenerate={() => { }} // Single regeneration not yet implemented
                                        isLoading={false}
                                        pantryScore={100} // Default score for AI plans
                                    />
                                );
                            })}
                        </div>
                    )}
                </section>

            </main>

            {/* AI Coach Widget */}
            <CoachWidget userId={user?.id} />
        </div>
    );
}
