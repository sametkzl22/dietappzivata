/**
 * API Integration Layer for Diet & Fitness Dashboard
 * Communicates with the FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// Types
// ============================================================================

export interface User {
    id: number;
    name: string | null;
    email: string | null;
    height_cm: number;
    weight_kg: number;
    gender: string;
    age: number;
    activity_level: string;
    waist_cm: number;
    neck_cm: number;
    hip_cm: number | null;
}

export interface HealthMetrics {
    user_id: number;
    bmi: number;
    body_fat_percent: number;
    bmr: number;
    tdee: number;
}

export interface Recipe {
    id: number;
    name: string;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    pantry_score?: number;
}

export interface MealSlot {
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    target_kcal: number;
    recommended_recipes: Recipe[];
}

export interface MealPlan {
    user_id: number;
    tdee: number;
    target_daily_kcal: number;
    deficit: number;
    meals: MealSlot[];
    total_macros: {
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        note?: string;
    };
}

export interface ChatResponse {
    response: string;
    user_context_used: boolean;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch user data by ID
 */
export async function getUser(userId: number): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Fetch user health metrics (BMI, TDEE, Body Fat %)
 */
export async function getHealthMetrics(userId: number): Promise<HealthMetrics> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/health`);
    if (!response.ok) {
        throw new Error(`Failed to fetch health metrics: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Generate a daily meal plan for a user
 */
export async function getDailyPlan(userId: number, deficit: number = -500): Promise<MealPlan> {
    const response = await fetch(`${API_BASE_URL}/plan/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, deficit }),
    });

    if (!response.ok) {
        throw new Error(`Failed to generate meal plan: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Chat with the AI Coach
 */
export async function chatWithCoach(
    message: string,
    userId?: number
): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message,
            user_id: userId
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to chat with AI: ${response.statusText}`);
    }
    return response.json();
}

// ============================================================================
// Mock Data (for development/demo when backend is unavailable)
// ============================================================================

export const mockUser: User = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    height_cm: 175,
    weight_kg: 80,
    gender: 'male',
    age: 30,
    activity_level: 'moderate',
    waist_cm: 85,
    neck_cm: 38,
    hip_cm: null,
};

export const mockHealthMetrics: HealthMetrics = {
    user_id: 1,
    bmi: 26.12,
    body_fat_percent: 16.94,
    bmr: 1748.75,
    tdee: 2710.56,
};

export const mockMealPlan: MealPlan = {
    user_id: 1,
    tdee: 2710.56,
    target_daily_kcal: 2210.56,
    deficit: -500,
    meals: [
        {
            meal_type: 'breakfast',
            target_kcal: 552.64,
            recommended_recipes: [
                {
                    id: 1,
                    name: 'Oatmeal with Berries & Honey',
                    meal_type: 'breakfast',
                    kcal: 520,
                    protein_g: 15,
                    carbs_g: 72,
                    fat_g: 12,
                    pantry_score: 80,
                },
                {
                    id: 2,
                    name: 'Greek Yogurt Parfait',
                    meal_type: 'breakfast',
                    kcal: 480,
                    protein_g: 22,
                    carbs_g: 58,
                    fat_g: 14,
                    pantry_score: 60,
                },
            ],
        },
        {
            meal_type: 'lunch',
            target_kcal: 773.70,
            recommended_recipes: [
                {
                    id: 3,
                    name: 'Grilled Chicken Salad',
                    meal_type: 'lunch',
                    kcal: 720,
                    protein_g: 45,
                    carbs_g: 35,
                    fat_g: 28,
                    pantry_score: 90,
                },
            ],
        },
        {
            meal_type: 'dinner',
            target_kcal: 663.17,
            recommended_recipes: [
                {
                    id: 4,
                    name: 'Salmon with Roasted Vegetables',
                    meal_type: 'dinner',
                    kcal: 650,
                    protein_g: 42,
                    carbs_g: 28,
                    fat_g: 32,
                    pantry_score: 75,
                },
            ],
        },
        {
            meal_type: 'snack',
            target_kcal: 221.06,
            recommended_recipes: [
                {
                    id: 5,
                    name: 'Mixed Nuts & Apple',
                    meal_type: 'snack',
                    kcal: 210,
                    protein_g: 6,
                    carbs_g: 22,
                    fat_g: 12,
                    pantry_score: 100,
                },
            ],
        },
    ],
    total_macros: {
        protein_g: 108,
        carbs_g: 157,
        fat_g: 84,
        note: 'Based on top recipe recommendations',
    },
};
