'use client';

import { useEffect, useState } from 'react';
import {
    Scale,
    Target,
    Flame,
    Activity,
    Calendar,
    ArrowRight,
    Loader2
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import MealCard, { MealCardSkeleton } from '@/components/MealCard';
import CoachWidget from '@/components/CoachWidget';
import {
    getUser,
    getHealthMetrics,
    getDailyPlan,
    mockUser,
    mockHealthMetrics,
    mockMealPlan,
    type User,
    type HealthMetrics,
    type MealPlan
} from '@/lib/api';

export default function DashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
    const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useMockData, setUseMockData] = useState(false);

    // Fetch initial data
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            setError(null);

            try {
                const [userData, metricsData, planData] = await Promise.all([
                    getUser(1),
                    getHealthMetrics(1),
                    getDailyPlan(1, -500),
                ]);

                setUser(userData);
                setHealthMetrics(metricsData);
                setMealPlan(planData);
                setUseMockData(false);
            } catch (err) {
                console.error('Failed to fetch data from API, using mock data:', err);
                // Fallback to mock data
                setUser(mockUser);
                setHealthMetrics(mockHealthMetrics);
                setMealPlan(mockMealPlan);
                setUseMockData(true);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, []);

    // Generate new plan
    const handleGeneratePlan = async () => {
        setIsGenerating(true);
        try {
            const newPlan = await getDailyPlan(1, -500);
            setMealPlan(newPlan);
        } catch (err) {
            console.error('Failed to generate plan:', err);
            // Keep existing plan
        } finally {
            setIsGenerating(false);
        }
    };

    // Get today's date formatted
    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Helper to get top recipe from meal slot
    const getTopRecipe = (mealType: string) => {
        const meal = mealPlan?.meals.find(m => m.meal_type === mealType);
        return meal?.recommended_recipes[0] || null;
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

                        {useMockData && (
                            <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                                Demo Mode
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">
                {/* Welcome Section */}
                <section className="mb-8">
                    <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">
                                Hello, {user?.name || 'User'}! 👋
                            </h2>
                            <p className="mt-1 text-slate-500">
                                <Calendar className="mr-1.5 inline-block h-4 w-4" />
                                {today}
                            </p>
                        </div>

                        {healthMetrics && (
                            <div className="mt-4 flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 md:mt-0">
                                <Flame className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-700">
                                    Daily Goal: {Math.round(mealPlan?.target_daily_kcal || 0)} kcal
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
                                subValue="Target: 75 kg"
                                colorScheme="blue"
                            />

                            <StatsCard
                                icon={Flame}
                                label="Daily Calories"
                                value={Math.round(mealPlan?.target_daily_kcal || 0)}
                                subValue={`/ ${Math.round(healthMetrics?.tdee || 0)} TDEE`}
                                colorScheme="amber"
                            />

                            <StatsCard
                                icon={Target}
                                label="BMI Score"
                                value={healthMetrics?.bmi?.toFixed(1) || '--'}
                                subValue={
                                    healthMetrics?.bmi
                                        ? healthMetrics.bmi < 18.5 ? 'Underweight'
                                            : healthMetrics.bmi < 25 ? 'Normal'
                                                : healthMetrics.bmi < 30 ? 'Overweight'
                                                    : 'Obese'
                                        : ''
                                }
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

                {/* Meal Plan Section */}
                <section className="mb-10">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Today's Nutrition Plan</h3>
                            <p className="text-sm text-slate-500">
                                Personalized meals based on your {Math.abs(mealPlan?.deficit || 500)} kcal deficit goal
                            </p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {[1, 2, 3, 4].map((i) => (
                                <MealCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => {
                                const meal = mealPlan?.meals.find(m => m.meal_type === mealType);
                                const recipe = meal?.recommended_recipes[0];

                                return (
                                    <MealCard
                                        key={mealType}
                                        mealType={mealType}
                                        recipeName={recipe?.name || 'No recipe available'}
                                        calories={recipe?.kcal || 0}
                                        targetCalories={meal?.target_kcal || 0}
                                        protein={recipe?.protein_g || 0}
                                        carbs={recipe?.carbs_g || 0}
                                        fat={recipe?.fat_g || 0}
                                        pantryScore={recipe?.pantry_score}
                                        onRegenerate={() => handleGeneratePlan()}
                                        isLoading={isGenerating}
                                    />
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Generate Tomorrow's Plan */}
                <section className="mb-10">
                    <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-white shadow-xl shadow-emerald-200/50">
                        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-2xl font-bold">Ready for Tomorrow?</h3>
                                <p className="mt-2 text-emerald-100">
                                    Generate a fresh meal plan tailored to your goals and pantry ingredients.
                                </p>
                            </div>

                            <button
                                onClick={handleGeneratePlan}
                                disabled={isGenerating}
                                className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-emerald-600 shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Generating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Generate New Plan</span>
                                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Daily Macros Summary */}
                {mealPlan && (
                    <section className="mb-10">
                        <h3 className="mb-4 text-lg font-semibold text-slate-800">Daily Macro Summary</h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 p-6">
                                <p className="text-sm font-medium text-rose-600">Total Protein</p>
                                <p className="mt-1 text-3xl font-bold text-rose-700">
                                    {mealPlan.total_macros.protein_g}g
                                </p>
                            </div>

                            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 p-6">
                                <p className="text-sm font-medium text-amber-600">Total Carbs</p>
                                <p className="mt-1 text-3xl font-bold text-amber-700">
                                    {mealPlan.total_macros.carbs_g}g
                                </p>
                            </div>

                            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-6">
                                <p className="text-sm font-medium text-blue-600">Total Fat</p>
                                <p className="mt-1 text-3xl font-bold text-blue-700">
                                    {mealPlan.total_macros.fat_g}g
                                </p>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {/* AI Coach Widget */}
            <CoachWidget userId={user?.id} />
        </div>
    );
}
