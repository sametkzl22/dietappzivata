/**
 * API Integration Layer for Diet & Fitness Dashboard
 * Communicates with the FastAPI backend with JWT Authentication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// Auth Token Management
// ============================================================================

export function getToken(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('access_token');
    }
    return null;
}

export function setToken(token: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', token);
    }
}

export function removeToken(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
    }
}

export function getStoredUser(): User | null {
    if (typeof window !== 'undefined') {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
    return null;
}

export function setStoredUser(user: User): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
    }
}

export function isAuthenticated(): boolean {
    return !!getToken();
}

// ============================================================================
// Types
// ============================================================================

export interface User {
    id: number;
    name: string | null;
    email: string;
    height_cm: number;
    weight_kg: number;
    gender: string;
    age: number;
    activity_level: string;
    waist_cm: number;
    neck_cm: number;
    hip_cm: number | null;
    is_active: boolean;
    is_superuser: boolean;
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

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    height_cm: number;
    weight_kg: number;
    gender: string;
    age: number;
    activity_level: string;
    waist_cm: number;
    neck_cm: number;
    hip_cm?: number;
}

export interface AdminStats {
    statistics: {
        total_users: number;
        active_users: number;
        inactive_users: number;
        admin_users: number;
    };
    users: AdminUserInfo[];
}

export interface AdminUserInfo {
    id: number;
    name: string | null;
    email: string;
    is_active: boolean;
    is_superuser: boolean;
    gender: string;
    age: number;
}

// ============================================================================
// Fetch Helper with Auth
// ============================================================================

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // If unauthorized, clear token and redirect to login
    if (response.status === 401) {
        removeToken();
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }

    return response;
}

// ============================================================================
// Auth API Functions
// ============================================================================

/**
 * Login user and get JWT token
 */
export async function login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    try {
        const formData = new URLSearchParams();
        formData.append('username', credentials.email);
        formData.append('password', credentials.password);

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.detail || 'Login failed' };
        }

        const data = await response.json();
        setToken(data.access_token);

        // Fetch and store user data
        const user = await getCurrentUser();
        if (user) {
            setStoredUser(user);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: 'Network error. Please try again.' };
    }
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.detail || 'Registration failed' };
        }

        // Auto-login after registration
        return await login({ email: data.email, password: data.password });
    } catch (error) {
        return { success: false, error: 'Network error. Please try again.' };
    }
}

/**
 * Logout user
 */
export function logout(): void {
    removeToken();
    if (typeof window !== 'undefined') {
        window.location.href = '/';
    }
}

/**
 * Get current logged in user
 */
export async function getCurrentUser(): Promise<User | null> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/users/me`);
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

/**
 * Get current user's health metrics
 */
export async function getCurrentUserHealth(): Promise<HealthMetrics | null> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/users/me/health`);
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

// ============================================================================
// Admin API Functions
// ============================================================================

/**
 * Get all users (Admin only)
 */
export async function getAdminUsers(): Promise<AdminStats | null> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/admin/users`);
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

/**
 * Toggle user admin status (Admin only)
 */
export async function toggleUserAdmin(userId: number): Promise<boolean> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}/toggle-admin`, {
            method: 'PATCH',
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Toggle user active status (Admin only)
 */
export async function toggleUserActive(userId: number): Promise<boolean> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}/toggle-active`, {
            method: 'PATCH',
        });
        return response.ok;
    } catch {
        return false;
    }
}

// ============================================================================
// User API Functions
// ============================================================================

/**
 * Fetch user data by ID
 */
export async function getUser(userId: number): Promise<User> {
    const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Fetch user health metrics (BMI, TDEE, Body Fat %)
 */
export async function getHealthMetrics(userId: number): Promise<HealthMetrics> {
    const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}/health`);
    if (!response.ok) {
        throw new Error(`Failed to fetch health metrics: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Generate a daily meal plan for a user
 */
export async function getDailyPlan(userId: number, deficit: number = -500): Promise<MealPlan> {
    const response = await fetchWithAuth(`${API_BASE_URL}/plan/generate`, {
        method: 'POST',
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
    const response = await fetchWithAuth(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
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
    is_active: true,
    is_superuser: false,
};

export const mockHealthMetrics: HealthMetrics = {
    user_id: 1,
    bmi: 26.12,
    body_fat_percent: 16.94,
    bmr: 1748.75,
    tdee: 2710.56,
};
