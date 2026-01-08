"""
Pydantic Schemas for Diet & Fitness API.

These schemas handle request/response validation and serialization.
"""

from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field


# ============================================================================
# Enums
# ============================================================================

class ActivityLevel(str, Enum):
    """Activity level for TDEE calculation."""
    sedentary = "sedentary"
    light = "light"
    moderate = "moderate"
    very = "very"
    athlete = "athlete"


class MealType(str, Enum):
    """Meal type classification."""
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"


# ============================================================================
# User Schemas
# ============================================================================

class UserBase(BaseModel):
    """Base user schema with common attributes."""
    name: Optional[str] = None
    email: str = Field(..., description="User email address")
    height_cm: float = Field(..., gt=0, description="Height in centimeters")
    weight_kg: float = Field(..., gt=0, description="Weight in kilograms")
    gender: str = Field(..., pattern="^(male|female)$", description="Gender: 'male' or 'female'")
    age: int = Field(..., gt=0, lt=150, description="Age in years")
    activity_level: ActivityLevel
    waist_cm: float = Field(..., gt=0, description="Waist circumference in cm")
    neck_cm: float = Field(..., gt=0, description="Neck circumference in cm")
    hip_cm: Optional[float] = Field(None, gt=0, description="Hip circumference in cm (required for females)")


class UserCreate(UserBase):
    """Schema for creating a new user with password."""
    password: str = Field(..., min_length=6, description="User password (min 6 characters)")


class UserLogin(BaseModel):
    """Schema for user login."""
    email: str = Field(..., description="User email")
    password: str = Field(..., description="User password")


class UserUpdate(BaseModel):
    """Schema for updating user data (all fields optional)."""
    name: Optional[str] = None
    email: Optional[str] = None
    height_cm: Optional[float] = Field(None, gt=0)
    weight_kg: Optional[float] = Field(None, gt=0)
    gender: Optional[str] = Field(None, pattern="^(male|female)$")
    age: Optional[int] = Field(None, gt=0, lt=150)
    activity_level: Optional[ActivityLevel] = None
    waist_cm: Optional[float] = Field(None, gt=0)
    neck_cm: Optional[float] = Field(None, gt=0)
    hip_cm: Optional[float] = Field(None, gt=0)
    target_weight_kg: Optional[float] = Field(None, gt=0, description="Target weight goal")


class UserResponse(UserBase):
    """Schema for user response with ID."""
    id: int
    is_active: bool = True
    is_superuser: bool = False
    target_weight_kg: Optional[float] = None

    class Config:
        from_attributes = True


# ============================================================================
# Authentication Schemas
# ============================================================================

class Token(BaseModel):
    """JWT Token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data."""
    email: Optional[str] = None


class HealthMetrics(BaseModel):
    """User health metrics response."""
    user_id: int
    bmi: float = Field(..., description="Body Mass Index")
    body_fat_percent: float = Field(..., description="Body fat percentage (Navy Method)")
    bmr: float = Field(..., description="Basal Metabolic Rate (kcal/day)")
    tdee: float = Field(..., description="Total Daily Energy Expenditure (kcal/day)")


# ============================================================================
# Ingredient Schemas
# ============================================================================

class IngredientBase(BaseModel):
    """Base ingredient schema."""
    name: str
    unit: str = Field(..., description="Unit of measurement (e.g., 'grams', 'cups')")
    kcal_per_unit: float = Field(..., ge=0, description="Calories per unit")


class IngredientCreate(IngredientBase):
    """Schema for creating an ingredient."""
    pass


class IngredientResponse(IngredientBase):
    """Schema for ingredient response."""
    id: int

    class Config:
        from_attributes = True


# ============================================================================
# Recipe Schemas
# ============================================================================

class RecipeIngredientBase(BaseModel):
    """Recipe ingredient junction schema."""
    ingredient_id: int
    quantity: float = Field(..., gt=0)


class RecipeIngredientResponse(BaseModel):
    """Recipe ingredient with details."""
    ingredient_id: int
    ingredient_name: str
    quantity: float
    unit: str

    class Config:
        from_attributes = True


class RecipeBase(BaseModel):
    """Base recipe schema with macros."""
    name: str
    meal_type: MealType
    kcal: float = Field(..., ge=0, description="Total calories")
    protein_g: float = Field(..., ge=0, description="Protein in grams")
    carbs_g: float = Field(..., ge=0, description="Carbohydrates in grams")
    fat_g: float = Field(..., ge=0, description="Fat in grams")
    description: Optional[str] = None
    instructions: Optional[str] = None


class RecipeCreate(RecipeBase):
    """Schema for creating a recipe."""
    ingredients: Optional[List[RecipeIngredientBase]] = []


class RecipeResponse(RecipeBase):
    """Schema for recipe response."""
    id: int
    ingredients: List[RecipeIngredientResponse] = []

    class Config:
        from_attributes = True


class RecipeSimple(BaseModel):
    """Simplified recipe for meal plan display."""
    id: int
    name: str
    meal_type: MealType
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    pantry_score: Optional[float] = Field(None, description="Percentage of ingredients user owns")

    class Config:
        from_attributes = True


# ============================================================================
# Pantry Schemas
# ============================================================================

class PantryItemBase(BaseModel):
    """Base pantry item schema."""
    ingredient_id: int
    quantity: float = Field(..., gt=0)


class PantryItemCreate(PantryItemBase):
    """Schema for adding item to pantry."""
    pass


class PantryItemResponse(BaseModel):
    """Pantry item response with ingredient details."""
    id: int
    user_id: int
    ingredient_id: int
    ingredient_name: str
    quantity: float
    unit: str

    class Config:
        from_attributes = True


class PantryUpdate(BaseModel):
    """Schema for updating pantry quantity."""
    quantity: float = Field(..., gt=0)


# ============================================================================
# Meal Plan Schemas
# ============================================================================

class MealPlanRequest(BaseModel):
    """Request for generating a meal plan."""
    user_id: int
    deficit: int = Field(
        default=-500,
        ge=-1000,
        le=500,
        description="Calorie deficit/surplus from TDEE (-500 for weight loss)"
    )


class MealSlot(BaseModel):
    """A single meal slot in the plan."""
    meal_type: MealType
    target_kcal: float
    recommended_recipes: List[RecipeSimple]


class MealPlanResponse(BaseModel):
    """Generated meal plan response."""
    user_id: int
    tdee: float
    target_daily_kcal: float
    deficit: int
    meals: List[MealSlot]
    total_macros: dict


# ============================================================================
# AI Chat Schemas
# ============================================================================

class ChatRequest(BaseModel):
    """Request for AI coach chat."""
    user_id: Optional[int] = None
    message: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    """Response from AI coach."""
    response: str
    user_context_used: bool = False


# ============================================================================
# AI Recipe Generation Schemas
# ============================================================================

class AIRecipe(BaseModel):
    """A single AI-generated recipe with nutritional info and health tips."""
    name: str = Field(..., description="Recipe name")
    time_minutes: int = Field(..., ge=1, description="Cooking time in minutes")
    calories: int = Field(..., ge=0, description="Total calories for the portion")
    protein: str = Field(..., description="Protein content (e.g., '35g')")
    carbs: str = Field(..., description="Carbohydrate content (e.g., '45g')")
    fat: str = Field(..., description="Fat content (e.g., '12g')")
    ingredients_used: List[str] = Field(..., description="Ingredients from user's pantry")
    missing_ingredients: List[str] = Field(default=[], description="Ingredients user might need to buy")
    instructions: List[str] = Field(..., description="Step-by-step cooking instructions")
    health_tip: str = Field(..., description="Personalized health tip based on user's profile")


class AIRecipeResponse(BaseModel):
    """Response containing AI-generated recipes."""
    recipes: List[AIRecipe]
    user_tdee: Optional[float] = Field(None, description="User's TDEE for context")
    user_goal: Optional[str] = Field(None, description="User's fitness goal")


class SuggestRecipeRequest(BaseModel):
    """Request for AI recipe suggestions."""
    ingredients: List[str] = Field(..., min_length=1, description="List of available ingredients")
    dietary_preferences: Optional[str] = Field(None, description="e.g., 'vegetarian', 'low-carb', 'high-protein'")
    meal_type: Optional[MealType] = Field(None, description="Preferred meal type")


# ============================================================================
# Diet Plan Schemas (Long-Term Planning)
# ============================================================================

class PlanDuration(str, Enum):
    """Duration options for meal plans."""
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class PlanGenerateRequest(BaseModel):
    """Request to generate a new meal plan."""
    duration: PlanDuration = Field(..., description="Plan duration: daily, weekly, or monthly")
    dietary_preferences: Optional[str] = Field(None, description="Optional dietary preferences")
    excluded_ingredients: List[str] = Field(default=[], description="Ingredients to strictly exclude")
    included_ingredients: List[str] = Field(default=[], description="Ingredients to prioritize (Must-Have)")
    workout_preference: str = Field("Gym", description="Workout type: 'Gym' or 'Home'")


class DayMeal(BaseModel):
    """A single meal in a day."""
    name: str
    calories: int
    protein: str
    carbs: str
    fat: str
    description: Optional[str] = None
    ingredients: List[str] = []
    instructions: List[str] = []


class Exercise(BaseModel):
    name: str
    duration_minutes: int
    calories_burned: int
    sets: Optional[str] = None
    reps: Optional[str] = None
    instructions: Optional[str] = None


class DayPlan(BaseModel):
    """A single day's meal and fitness plan."""
    day_label: str = Field(..., description="e.g., 'Day 1', 'Monday'")
    meals: Dict[str, DayMeal] = Field(..., description="Meals by type: breakfast, lunch, dinner, snack")
    total_calories_in: int = Field(..., alias="total_calories") # Mapping old name if possible, or new field
    
    # Fitness
    exercises: List[Exercise] = []
    total_calories_burned: int = 0
    net_calories: int = 0
    daily_tip: Optional[str] = None


class DietPlanData(BaseModel):
    """The structured plan data stored in the database."""
    days: List[DayPlan]
    target_calories_per_day: Optional[int] = None
    user_tdee: Optional[float] = None


class DietPlanResponse(BaseModel):
    """Response containing a diet plan."""
    id: int
    duration: str
    status: str
    created_at: datetime
    plan_data: dict

    class Config:
        from_attributes = True


class DietPlanListResponse(BaseModel):
    """Response containing a list of diet plans."""
    plans: List[DietPlanResponse]


# ============================================================================
# Community & Social Schemas
# ============================================================================

# Forum Schemas
class PostCreate(BaseModel):
    """Schema for creating a forum post."""
    title: str = Field(..., min_length=1, max_length=200, description="Post title")
    content: str = Field(..., min_length=1, max_length=10000, description="Post content")


class CommentCreate(BaseModel):
    """Schema for creating a comment on a post."""
    content: str = Field(..., min_length=1, max_length=2000, description="Comment content")


class CommentResponse(BaseModel):
    """Schema for comment response."""
    id: int
    post_id: int
    user_id: int
    user_name: Optional[str] = None
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    """Schema for forum post response."""
    id: int
    user_id: int
    user_name: Optional[str] = None
    title: str
    content: str
    created_at: datetime
    comments_count: int = 0
    comments: List[CommentResponse] = []

    class Config:
        from_attributes = True


# Message Schemas
class MessageCreate(BaseModel):
    """Schema for sending a direct message."""
    receiver_id: int = Field(..., description="ID of the user to send message to")
    content: str = Field(..., min_length=1, max_length=5000, description="Message content")


class MessageResponse(BaseModel):
    """Schema for message response."""
    id: int
    sender_id: int
    sender_name: Optional[str] = None
    receiver_id: int
    receiver_name: Optional[str] = None
    content: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """Schema for conversation summary in inbox."""
    other_user_id: int
    other_user_name: Optional[str] = None
    last_message: str
    last_message_time: datetime
    unread_count: int = 0


# Event Schemas
class EventCreate(BaseModel):
    """Schema for creating an event (Admin only)."""
    title: str = Field(..., min_length=1, max_length=200, description="Event title")
    description: Optional[str] = Field(None, max_length=5000, description="Event description")
    date: datetime = Field(..., description="Event date and time")
    location: Optional[str] = Field(None, max_length=500, description="Event location")


class ParticipantResponse(BaseModel):
    """Schema for event participant."""
    user_id: int
    user_name: Optional[str] = None
    joined_at: datetime

    class Config:
        from_attributes = True


class EventResponse(BaseModel):
    """Schema for event response."""
    id: int
    title: str
    description: Optional[str] = None
    date: datetime
    location: Optional[str] = None
    created_by_id: int
    created_by_name: Optional[str] = None
    participant_count: int = 0
    participants: List[ParticipantResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


# User list for messaging
class UserSimple(BaseModel):
    """Simplified user info for messaging."""
    id: int
    name: Optional[str] = None
    email: str

    class Config:
        from_attributes = True
