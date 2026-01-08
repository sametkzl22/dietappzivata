/**
 * API Integration Layer for Diet & Fitness Dashboard
 * Communicates with the FastAPI backend with JWT Authentication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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
    };
}

export interface DayMeal {
    name: string;
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
    description?: string;
    ingredients?: string[];
    instructions?: string[];
}

export interface Exercise {
    name: string;
    duration_minutes: number;
    calories_burned: number;
    sets?: string;
    reps?: string;
    instructions?: string;
}

export interface DayPlan {
    day_label: string;
    meals: {
        breakfast: DayMeal;
        lunch: DayMeal;
        dinner: DayMeal;
        snack: DayMeal;
    };
    total_calories_in: number;
    // Fitness
    exercises: Exercise[];
    total_calories_burned: number;
    net_calories: number;
    daily_tip?: string;
    // Legacy support if needed, but safe to map
    total_calories?: number;
}

export interface DietPlanValues {
    days: DayPlan[];
    target_calories_per_day?: number;
    user_tdee?: number;
    goal?: string;
    shopping_list?: string[];
}

export interface DietPlan {
    id: number;
    duration: 'daily' | 'weekly' | 'monthly';
    status: string;
    created_at: string;
    plan_data: DietPlanValues;
}

export interface UserUpdate {
    name?: string;
    height_cm?: number;
    weight_kg?: number;
    age?: number;
    activity_level?: string;
    gender?: string;
    target_weight_kg?: number;
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
// AI Recipe Generation
// ============================================================================

export interface AIRecipe {
    name: string;
    time_minutes: number;
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
    ingredients_used: string[];
    missing_ingredients: string[];
    instructions: string[];
    health_tip: string;
}

export interface AIRecipeResponse {
    recipes: AIRecipe[];
    user_tdee: number | null;
    user_goal: string | null;
}

export interface SuggestRecipeRequest {
    ingredients: string[];
    dietary_preferences?: string;
    meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

/**
 * Get AI-powered recipe suggestions based on ingredients and user health profile
 */
export async function suggestRecipes(request: SuggestRecipeRequest): Promise<AIRecipeResponse> {
    const response = await fetchWithAuth(`${API_BASE_URL}/ai/suggest-recipes`, {
        method: 'POST',
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate recipes');
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

// Axios-like API wrapper for backward compatibility
export const api = {
    get: async (url: string) => {
        const response = await fetchWithAuth(`${API_BASE_URL}${url}`);
        return { data: await response.json() };
    },
    post: async (url: string, data?: unknown) => {
        const response = await fetchWithAuth(`${API_BASE_URL}${url}`, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
        return { data: await response.json() };
    },
    put: async (url: string, data?: unknown) => {
        const response = await fetchWithAuth(`${API_BASE_URL}${url}`, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
        return { data: await response.json() };
    },
    delete: async (url: string) => {
        const response = await fetchWithAuth(`${API_BASE_URL}${url}`, {
            method: 'DELETE',
        });
        return { data: response.ok };
    },
    patch: async (url: string, data?: unknown) => {
        const response = await fetchWithAuth(`${API_BASE_URL}${url}`, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
        return { data: await response.json() };
    },
};


// ============================================================================
// Profile & Plan API Wrappers
// ============================================================================

export async function updateProfile(data: UserUpdate): Promise<User> {
    const response = await api.patch('/users/me', data);
    const updatedUser = response.data;
    setStoredUser(updatedUser);
    return updatedUser;
}

export async function generateDietPlan(
    duration: 'daily' | 'weekly' | 'monthly',
    dietary_preferences?: string,
    excluded_ingredients?: string[],
    included_ingredients?: string[],
    workout_preference?: string
): Promise<DietPlan> {
    const url = `${API_BASE_URL}/plans/generate`;
    const response = await fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            duration,
            dietary_preferences,
            excluded_ingredients: excluded_ingredients || [],
            included_ingredients: included_ingredients || [],
            workout_preference: workout_preference || 'Gym'
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate plan');
    }

    return response.json();
}

export async function deleteCurrentPlan(): Promise<void> {
    const url = `${API_BASE_URL}/plans/current`;
    const response = await fetchWithAuth(url, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Failed to delete plan');
    }
}

export async function getCurrentDietPlan(): Promise<DietPlan | null> {
    try {
        const response = await api.get('/plans/current');
        return response.data;
    } catch (error) {
        return null;
    }
}

export async function getDietPlanHistory(): Promise<DietPlan[]> {
    try {
        const response = await api.get('/plans/history');
        return response.data.plans;
    } catch (error) {
        return [];
    }
}


// ============================================================================
// Community & Social Types
// ============================================================================

export interface ForumPost {
    id: number;
    user_id: number;
    user_name: string | null;
    title: string;
    content: string;
    created_at: string;
    comments_count: number;
    comments: ForumComment[];
}

export interface ForumComment {
    id: number;
    post_id: number;
    user_id: number;
    user_name: string | null;
    content: string;
    created_at: string;
}

export interface DirectMessage {
    id: number;
    sender_id: number;
    sender_name: string | null;
    receiver_id: number;
    receiver_name: string | null;
    content: string;
    is_read: boolean;
    created_at: string;
}

export interface Conversation {
    other_user_id: number;
    other_user_name: string | null;
    last_message: string;
    last_message_time: string;
    unread_count: number;
}

export interface CommunityEvent {
    id: number;
    title: string;
    description: string | null;
    date: string;
    location: string | null;
    created_by_id: number;
    created_by_name: string | null;
    participant_count: number;
    participants: EventParticipant[];
    created_at: string;
}

export interface EventParticipant {
    user_id: number;
    user_name: string | null;
    joined_at: string;
}

export interface UserSimple {
    id: number;
    name: string | null;
    email: string;
}


// ============================================================================
// Forum API Functions
// ============================================================================

export async function getForumPosts(): Promise<ForumPost[]> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/forum/posts`);
        if (!response.ok) return [];
        return response.json();
    } catch {
        return [];
    }
}

export async function getForumPost(postId: number): Promise<ForumPost | null> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/forum/posts/${postId}`);
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

export async function createForumPost(title: string, content: string): Promise<ForumPost | null> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/forum/posts`, {
            method: 'POST',
            body: JSON.stringify({ title, content }),
        });
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

export async function deleteForumPost(postId: number): Promise<boolean> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/forum/posts/${postId}`, {
            method: 'DELETE',
        });
        return response.ok;
    } catch {
        return false;
    }
}

export async function addComment(postId: number, content: string): Promise<ForumComment | null> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/forum/posts/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}


// ============================================================================
// Messages API Functions
// ============================================================================

export async function sendMessage(receiverId: number, content: string): Promise<DirectMessage | null> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/messages/send`, {
            method: 'POST',
            body: JSON.stringify({ receiver_id: receiverId, content }),
        });
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

export async function getInbox(): Promise<Conversation[]> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/messages/inbox`);
        if (!response.ok) return [];
        return response.json();
    } catch {
        return [];
    }
}

export async function getConversation(userId: number): Promise<DirectMessage[]> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/messages/conversation/${userId}`);
        if (!response.ok) return [];
        return response.json();
    } catch {
        return [];
    }
}

export async function getUsersForMessaging(): Promise<UserSimple[]> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/messages/users`);
        if (!response.ok) return [];
        return response.json();
    } catch {
        return [];
    }
}


// ============================================================================
// Events API Functions
// ============================================================================

export async function getEvents(): Promise<CommunityEvent[]> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/events`);
        if (!response.ok) return [];
        return response.json();
    } catch {
        return [];
    }
}

export async function getEvent(eventId: number): Promise<CommunityEvent | null> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/events/${eventId}`);
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

export async function createEvent(
    title: string,
    description: string,
    date: string,
    location: string
): Promise<CommunityEvent | null> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/events`, {
            method: 'POST',
            body: JSON.stringify({ title, description, date, location }),
        });
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

export async function joinEvent(eventId: number): Promise<boolean> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/events/${eventId}/join`, {
            method: 'POST',
        });
        return response.ok;
    } catch {
        return false;
    }
}

export async function leaveEvent(eventId: number): Promise<boolean> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/events/${eventId}/leave`, {
            method: 'DELETE',
        });
        return response.ok;
    } catch {
        return false;
    }
}

export async function getEventParticipants(eventId: number): Promise<EventParticipant[]> {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/events/${eventId}/participants`);
        if (!response.ok) return [];
        return response.json();
    } catch {
        return [];
    }
}
