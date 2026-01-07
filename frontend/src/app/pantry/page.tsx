'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, suggestRecipes, AIRecipe } from '@/lib/api';
import {
    ChefHat, Plus, Trash2, Search, ArrowLeft, Sparkles, Clock, Flame,
    Apple, Carrot, Egg, Fish, Beef, Wheat, Milk, Cookie, ShoppingCart,
    ChevronDown, ChevronUp, Loader2, AlertCircle, Target, Utensils
} from 'lucide-react';
import Link from 'next/link';

interface Ingredient {
    id: number;
    name: string;
    category: string;
    quantity?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
    fruits: <Apple className="h-4 w-4" />,
    vegetables: <Carrot className="h-4 w-4" />,
    eggs: <Egg className="h-4 w-4" />,
    seafood: <Fish className="h-4 w-4" />,
    meat: <Beef className="h-4 w-4" />,
    grains: <Wheat className="h-4 w-4" />,
    dairy: <Milk className="h-4 w-4" />,
    snacks: <Cookie className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
    fruits: 'bg-red-100 text-red-600',
    vegetables: 'bg-green-100 text-green-600',
    eggs: 'bg-yellow-100 text-yellow-600',
    seafood: 'bg-blue-100 text-blue-600',
    meat: 'bg-rose-100 text-rose-600',
    grains: 'bg-amber-100 text-amber-600',
    dairy: 'bg-sky-100 text-sky-600',
    snacks: 'bg-purple-100 text-purple-600',
    other: 'bg-slate-100 text-slate-600',
};

const suggestedIngredients = [
    { name: 'Chicken Breast', category: 'meat' },
    { name: 'Salmon', category: 'seafood' },
    { name: 'Eggs', category: 'eggs' },
    { name: 'Spinach', category: 'vegetables' },
    { name: 'Broccoli', category: 'vegetables' },
    { name: 'Brown Rice', category: 'grains' },
    { name: 'Quinoa', category: 'grains' },
    { name: 'Greek Yogurt', category: 'dairy' },
    { name: 'Avocado', category: 'fruits' },
    { name: 'Blueberries', category: 'fruits' },
    { name: 'Almonds', category: 'snacks' },
    { name: 'Sweet Potato', category: 'vegetables' },
];

export default function PantryPage() {
    const router = useRouter();
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [newIngredient, setNewIngredient] = useState('');
    const [newCategory, setNewCategory] = useState('other');
    const [searchTerm, setSearchTerm] = useState('');
    const [adding, setAdding] = useState(false);

    // AI Recipe Generation State
    const [generatingRecipes, setGeneratingRecipes] = useState(false);
    const [recipes, setRecipes] = useState<AIRecipe[]>([]);
    const [recipeError, setRecipeError] = useState<string | null>(null);
    const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
    const [userTdee, setUserTdee] = useState<number | null>(null);
    const [userGoal, setUserGoal] = useState<string | null>(null);
    const [dietaryPreference, setDietaryPreference] = useState<string>('');

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/login');
            return;
        }
        loadIngredients();
    }, [router]);

    const loadIngredients = () => {
        const stored = localStorage.getItem('pantry_ingredients');
        if (stored) {
            setIngredients(JSON.parse(stored));
        }
        setLoading(false);
    };

    const addIngredient = () => {
        if (!newIngredient.trim()) return;

        setAdding(true);
        const ingredient: Ingredient = {
            id: Date.now(),
            name: newIngredient.trim(),
            category: newCategory,
        };

        const updated = [...ingredients, ingredient];
        setIngredients(updated);
        localStorage.setItem('pantry_ingredients', JSON.stringify(updated));
        setNewIngredient('');
        setNewCategory('other');
        setAdding(false);
    };

    const removeIngredient = (id: number) => {
        const updated = ingredients.filter(i => i.id !== id);
        setIngredients(updated);
        localStorage.setItem('pantry_ingredients', JSON.stringify(updated));
    };

    const addSuggested = (item: { name: string; category: string }) => {
        const exists = ingredients.some(i => i.name.toLowerCase() === item.name.toLowerCase());
        if (exists) return;

        const ingredient: Ingredient = {
            id: Date.now(),
            name: item.name,
            category: item.category,
        };

        const updated = [...ingredients, ingredient];
        setIngredients(updated);
        localStorage.setItem('pantry_ingredients', JSON.stringify(updated));
    };

    const generateAIRecipes = async () => {
        if (ingredients.length === 0) {
            setRecipeError('Please add some ingredients first');
            return;
        }

        setGeneratingRecipes(true);
        setRecipeError(null);
        setRecipes([]);

        try {
            const ingredientNames = ingredients.map(i => i.name);
            const result = await suggestRecipes({
                ingredients: ingredientNames,
                dietary_preferences: dietaryPreference || undefined,
            });

            setRecipes(result.recipes);
            setUserTdee(result.user_tdee);
            setUserGoal(result.user_goal);

            if (result.recipes.length > 0) {
                setExpandedRecipe(0);
            }
        } catch (error) {
            setRecipeError(error instanceof Error ? error.message : 'Failed to generate recipes');
        } finally {
            setGeneratingRecipes(false);
        }
    };

    const filteredIngredients = ingredients.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedIngredients = filteredIngredients.reduce((acc, ing) => {
        const cat = ing.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(ing);
        return acc;
    }, {} as Record<string, Ingredient[]>);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 pt-20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 pt-20 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors mb-2"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                                <ChefHat className="h-6 w-6 text-white" />
                            </div>
                            Smart Pantry & AI Chef
                        </h1>
                        <p className="text-slate-500 mt-2">Add ingredients and let AI create personalized recipes based on your health profile</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-emerald-600">{ingredients.length}</p>
                        <p className="text-sm text-slate-500">ingredients</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Pantry Management */}
                    <div className="space-y-6">
                        {/* Add New Ingredient */}
                        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Plus className="h-5 w-5 text-emerald-500" />
                                Add Ingredient
                            </h2>
                            <div className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    value={newIngredient}
                                    onChange={(e) => setNewIngredient(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
                                    placeholder="Enter ingredient name..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                                <div className="flex gap-3">
                                    <select
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="other">Other</option>
                                        <option value="fruits">Fruits</option>
                                        <option value="vegetables">Vegetables</option>
                                        <option value="meat">Meat</option>
                                        <option value="seafood">Seafood</option>
                                        <option value="dairy">Dairy</option>
                                        <option value="grains">Grains</option>
                                        <option value="eggs">Eggs</option>
                                        <option value="snacks">Snacks</option>
                                    </select>
                                    <button
                                        onClick={addIngredient}
                                        disabled={!newIngredient.trim() || adding}
                                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {adding ? 'Adding...' : 'Add'}
                                    </button>
                                </div>
                            </div>

                            {/* Quick Add Suggestions */}
                            <div className="mt-4">
                                <p className="text-sm text-slate-500 mb-2 flex items-center gap-1">
                                    <Sparkles className="h-4 w-4" />
                                    Quick add:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestedIngredients
                                        .filter(s => !ingredients.some(i => i.name.toLowerCase() === s.name.toLowerCase()))
                                        .slice(0, 6)
                                        .map((item, index) => (
                                            <button
                                                key={index}
                                                onClick={() => addSuggested(item)}
                                                className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm hover:bg-emerald-100 hover:text-emerald-700 transition-all"
                                            >
                                                + {item.name}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search ingredients..."
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                            />
                        </div>

                        {/* Ingredients Grid */}
                        {Object.keys(groupedIngredients).length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                    <ChefHat className="h-8 w-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Your pantry is empty</h3>
                                <p className="text-slate-500">Add ingredients to get AI recipe suggestions</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(groupedIngredients).map(([category, items]) => (
                                    <div key={category} className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
                                        <div className={`px-4 py-3 border-b border-slate-100 ${categoryColors[category] || categoryColors.other}`}>
                                            <h3 className="font-semibold capitalize flex items-center gap-2 text-sm">
                                                {categoryIcons[category] || <Cookie className="h-4 w-4" />}
                                                {category} ({items.length})
                                            </h3>
                                        </div>
                                        <div className="p-3">
                                            <div className="flex flex-wrap gap-2">
                                                {items.map((ingredient) => (
                                                    <div
                                                        key={ingredient.id}
                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 group hover:border-red-200 transition-all text-sm"
                                                    >
                                                        <span className="text-slate-700">{ingredient.name}</span>
                                                        <button
                                                            onClick={() => removeIngredient(ingredient.id)}
                                                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column - AI Recipe Generation */}
                    <div className="space-y-6">
                        {/* Generate Recipes Card */}
                        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Sparkles className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">AI Chef</h2>
                                    <p className="text-violet-200 text-sm">Personalized recipes for you</p>
                                </div>
                            </div>

                            <p className="text-violet-100 mb-4 text-sm">
                                Our AI considers your health profile (TDEE, BMI, activity level) to suggest
                                recipes with appropriate portions and macros.
                            </p>

                            {/* Dietary Preference */}
                            <div className="mb-4">
                                <label className="text-sm text-violet-200 mb-2 block">Dietary Preference (optional)</label>
                                <select
                                    value={dietaryPreference}
                                    onChange={(e) => setDietaryPreference(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                                >
                                    <option value="" className="text-slate-900">Any</option>
                                    <option value="high-protein" className="text-slate-900">High Protein</option>
                                    <option value="low-carb" className="text-slate-900">Low Carb</option>
                                    <option value="vegetarian" className="text-slate-900">Vegetarian</option>
                                    <option value="keto" className="text-slate-900">Keto</option>
                                    <option value="mediterranean" className="text-slate-900">Mediterranean</option>
                                </select>
                            </div>

                            <button
                                onClick={generateAIRecipes}
                                disabled={generatingRecipes || ingredients.length === 0}
                                className="w-full py-3 rounded-xl bg-white text-violet-600 font-bold hover:bg-violet-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {generatingRecipes ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Generating Recipes...
                                    </>
                                ) : (
                                    <>
                                        <Utensils className="h-5 w-5" />
                                        Generate AI Recipes
                                    </>
                                )}
                            </button>

                            {ingredients.length === 0 && (
                                <p className="text-violet-200 text-xs mt-2 text-center">
                                    Add ingredients to your pantry first
                                </p>
                            )}
                        </div>

                        {/* User Context Info */}
                        {userTdee && (
                            <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <Target className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Personalized for Your Profile</p>
                                        <p className="text-xs text-slate-500">
                                            Daily target: {Math.round(userTdee)} kcal • {userGoal}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {recipeError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                <p className="text-red-700 text-sm">{recipeError}</p>
                            </div>
                        )}

                        {/* Recipe Results */}
                        {recipes.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <ChefHat className="h-5 w-5 text-emerald-500" />
                                    AI-Generated Recipes ({recipes.length})
                                </h3>

                                {recipes.map((recipe, index) => (
                                    <div
                                        key={index}
                                        className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden"
                                    >
                                        {/* Recipe Header */}
                                        <button
                                            onClick={() => setExpandedRecipe(expandedRecipe === index ? null : index)}
                                            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg">
                                                    <span className="text-2xl">🍽️</span>
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-semibold text-slate-900">{recipe.name}</h4>
                                                    <div className="flex items-center gap-3 text-sm text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {recipe.time_minutes} min
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Flame className="h-3.5 w-3.5" />
                                                            {recipe.calories} kcal
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {expandedRecipe === index ? (
                                                <ChevronUp className="h-5 w-5 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-slate-400" />
                                            )}
                                        </button>

                                        {/* Expanded Content */}
                                        {expandedRecipe === index && (
                                            <div className="px-5 pb-5 border-t border-slate-100">
                                                {/* Macros */}
                                                <div className="grid grid-cols-3 gap-3 py-4">
                                                    <div className="text-center p-3 rounded-lg bg-blue-50">
                                                        <p className="text-lg font-bold text-blue-600">{recipe.protein}</p>
                                                        <p className="text-xs text-blue-500">Protein</p>
                                                    </div>
                                                    <div className="text-center p-3 rounded-lg bg-amber-50">
                                                        <p className="text-lg font-bold text-amber-600">{recipe.carbs}</p>
                                                        <p className="text-xs text-amber-500">Carbs</p>
                                                    </div>
                                                    <div className="text-center p-3 rounded-lg bg-rose-50">
                                                        <p className="text-lg font-bold text-rose-600">{recipe.fat}</p>
                                                        <p className="text-xs text-rose-500">Fat</p>
                                                    </div>
                                                </div>

                                                {/* Ingredients Used */}
                                                <div className="mb-4">
                                                    <h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                                        <Apple className="h-4 w-4 text-emerald-500" />
                                                        Ingredients from Your Pantry
                                                    </h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {recipe.ingredients_used.map((ing, i) => (
                                                            <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                                                                ✓ {ing}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Missing Ingredients */}
                                                {recipe.missing_ingredients.length > 0 && (
                                                    <div className="mb-4">
                                                        <h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                                            <ShoppingCart className="h-4 w-4 text-orange-500" />
                                                            You May Need
                                                        </h5>
                                                        <div className="flex flex-wrap gap-2">
                                                            {recipe.missing_ingredients.map((ing, i) => (
                                                                <span key={i} className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs">
                                                                    + {ing}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Instructions */}
                                                <div className="mb-4">
                                                    <h5 className="text-sm font-semibold text-slate-700 mb-2">Instructions</h5>
                                                    <ol className="space-y-2">
                                                        {recipe.instructions.map((step, i) => (
                                                            <li key={i} className="flex gap-3 text-sm text-slate-600">
                                                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                                                                    {i + 1}
                                                                </span>
                                                                <span>{step}</span>
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>

                                                {/* Health Tip */}
                                                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                            <Sparkles className="h-4 w-4 text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <h5 className="text-sm font-semibold text-emerald-800 mb-1">Health Tip</h5>
                                                            <p className="text-sm text-emerald-700">{recipe.health_tip}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
