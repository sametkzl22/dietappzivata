"""
Diet & Fitness API - FastAPI Application

A complete backend API for diet and fitness tracking with:
- User management with health calculations (BMI, Body Fat, TDEE)
- JWT Authentication & Admin Roles
- Recipe and ingredient management
- Pantry tracking system
- AI-powered meal plan generation
- Placeholder for Gemini AI coach integration

Run with: uvicorn main:app --reload
Docs: http://localhost:8000/docs
"""

import os
import shutil
import uuid
from datetime import timedelta, datetime
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from database import get_db, init_db
from models import (
    User, Recipe, Ingredient, Pantry, RecipeIngredient, 
    ActivityLevel, MealType, DietPlan,
    ForumPost, ForumComment, Message, Event, EventParticipant,
    Friendship, FriendshipStatus
)
from schemas import (
    UserCreate, UserUpdate, UserResponse, UserLogin, HealthMetrics,
    Token,
    RecipeCreate, RecipeResponse, RecipeSimple,
    IngredientCreate, IngredientResponse,
    PantryItemCreate, PantryItemResponse, PantryUpdate,
    MealPlanRequest, MealPlanResponse, MealSlot,
    ChatRequest, ChatResponse,
    SuggestRecipeRequest, AIRecipeResponse,
    PlanGenerateRequest, DietPlanResponse, DietPlanListResponse,
    PlanDuration,
    # Community & Social schemas
    PostCreate, PostResponse, CommentCreate, CommentResponse,
    MessageCreate, MessageResponse, ConversationResponse,
    EventCreate, EventResponse, ParticipantResponse, UserSimple,
    FriendRequestCreate, FriendResponse, FriendUserResponse
)
from engine import DietEngine
from ai_service import GeminiCoach
from auth import (
    get_password_hash,
    create_access_token,
    authenticate_user,
    get_current_user,
    get_current_admin,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# ============================================================================
# Application Setup
# ============================================================================

app = FastAPI(
    title="Diet & Fitness API",
    description="""
A comprehensive backend API for diet and fitness tracking.

## Features
- **Authentication**: JWT-based auth with admin roles
- **User Management**: Create and manage users with body measurements
- **Health Metrics**: Calculate BMI, Body Fat %, BMR, and TDEE
- **Recipe System**: Manage recipes with macro nutritional data
- **Pantry Tracking**: Track ingredients users own
- **Meal Planning**: Generate personalized meal plans based on TDEE
- **AI Coach**: Powered by Google Gemini AI

## Health Formulas
- **BMI**: weight / (height/100)²
- **Body Fat %**: U.S. Navy Method (gender-specific)
- **BMR**: Mifflin-St Jeor Equation
- **TDEE**: BMR × Activity Multiplier
    """,
    version="1.1.0",
    contact={
        "name": "API Support",
        "email": "support@example.com"
    }
)

# Initialize AI Coach with API key from environment
ai_coach = GeminiCoach(api_key=os.getenv("GEMINI_API_KEY"))

# Ensure static/uploads directory exists
UPLOADS_DIR = Path("static/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files for serving uploaded images
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Initialize the database on application startup."""
    init_db()


# ============================================================================
# Authentication Endpoints
# ============================================================================

@app.post(
    "/auth/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"],
    summary="Register a new user"
)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user account with password.
    
    - **email**: Unique email address (required)
    - **password**: Minimum 6 characters
    - **Required body measurements**: height_cm, weight_kg, age, gender, waist_cm, neck_cm
    - **hip_cm**: Required for females
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate hip measurement for females
    if user.gender.lower() == "female" and user.hip_cm is None:
        raise HTTPException(
            status_code=400,
            detail="Hip measurement is required for female users"
        )
    
    # Hash the password
    hashed_password = get_password_hash(user.password)
    
    db_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password,
        height_cm=user.height_cm,
        weight_kg=user.weight_kg,
        gender=user.gender,
        age=user.age,
        activity_level=ActivityLevel(user.activity_level.value),
        waist_cm=user.waist_cm,
        neck_cm=user.neck_cm,
        hip_cm=user.hip_cm
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@app.post(
    "/auth/login",
    response_model=Token,
    tags=["Authentication"],
    summary="Login and get access token"
)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT access token.
    
    Use this token in the Authorization header as: `Bearer <token>`
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


@app.get(
    "/users/me",
    response_model=UserResponse,
    tags=["Authentication"],
    summary="Get current user profile"
)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get the profile of the currently authenticated user."""
    return current_user


@app.get(
    "/users/me/health",
    response_model=HealthMetrics,
    tags=["Authentication"],
    summary="Get current user health metrics"
)
def get_current_user_health(current_user: User = Depends(get_current_user)):
    """Get health metrics (BMI, Body Fat %, BMR, TDEE) for the current user."""
    try:
        metrics = current_user.get_health_metrics()
        return HealthMetrics(user_id=current_user.id, **metrics)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch(
    "/users/me",
    response_model=UserResponse,
    tags=["Authentication"],
    summary="Update current user profile"
)
def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the profile of the currently authenticated user.
    
    Updatable fields include:
    - name, height_cm, weight_kg, age
    - activity_level, waist_cm, neck_cm, hip_cm
    - target_weight_kg (weight goal)
    """
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Don't allow email change through this endpoint
    if "email" in update_data:
        del update_data["email"]
    
    for field, value in update_data.items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return current_user


# ============================================================================
# Admin Endpoints
# ============================================================================

@app.get(
    "/admin/users",
    tags=["Admin"],
    summary="List all users (Admin only)"
)
def admin_list_users(
    skip: int = 0,
    limit: int = 100,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    **Admin Only** - Get all users in the system with statistics.
    
    Requires: `is_superuser = True`
    """
    users = db.query(User).offset(skip).limit(limit).all()
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    admin_users = db.query(User).filter(User.is_superuser == True).count()
    
    return {
        "statistics": {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": total_users - active_users,
            "admin_users": admin_users
        },
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "is_active": u.is_active,
                "is_superuser": u.is_superuser,
                "gender": u.gender,
                "age": u.age
            }
            for u in users
        ]
    }


@app.patch(
    "/admin/users/{user_id}/toggle-admin",
    tags=["Admin"],
    summary="Toggle user admin status (Admin only)"
)
def toggle_user_admin(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """**Admin Only** - Toggle superuser status for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own admin status")
    
    user.is_superuser = not user.is_superuser
    db.commit()
    
    return {
        "message": f"User {user.email} admin status updated",
        "is_superuser": user.is_superuser
    }


@app.patch(
    "/admin/users/{user_id}/toggle-active",
    tags=["Admin"],
    summary="Activate/Deactivate user (Admin only)"
)
def toggle_user_active(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """**Admin Only** - Toggle active status for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    user.is_active = not user.is_active
    db.commit()
    
    return {
        "message": f"User {user.email} status updated",
        "is_active": user.is_active
    }


# ============================================================================
# User Endpoints (Legacy - kept for backward compatibility)
# ============================================================================

@app.post(
    "/users/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Users"],
    summary="Create a new user (use /auth/signup instead)"
)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user with body measurements.
    
    **Deprecated**: Use `/auth/signup` for new registrations.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate hip measurement for females
    if user.gender.lower() == "female" and user.hip_cm is None:
        raise HTTPException(
            status_code=400,
            detail="Hip measurement is required for female users"
        )
    
    hashed_password = get_password_hash(user.password)
    
    db_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password,
        height_cm=user.height_cm,
        weight_kg=user.weight_kg,
        gender=user.gender,
        age=user.age,
        activity_level=ActivityLevel(user.activity_level.value),
        waist_cm=user.waist_cm,
        neck_cm=user.neck_cm,
        hip_cm=user.hip_cm
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@app.get(
    "/users/",
    response_model=List[UserResponse],
    tags=["Users"],
    summary="List all users"
)
def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a list of all users with pagination. Requires authentication."""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@app.get(
    "/users/{user_id}",
    response_model=UserResponse,
    tags=["Users"],
    summary="Get user by ID"
)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific user by their ID. Requires authentication."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.patch(
    "/users/{user_id}",
    response_model=UserResponse,
    tags=["Users"],
    summary="Update user"
)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user data (partial update supported). Users can only update their own data."""
    # Only allow users to update themselves (or admins can update anyone)
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "activity_level" and value is not None:
            value = ActivityLevel(value.value)
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user


@app.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Users"],
    summary="Delete user"
)
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a user by ID. Only admins or the user themselves can delete."""
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to delete this user")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()


@app.get(
    "/users/{user_id}/health",
    response_model=HealthMetrics,
    tags=["Users"],
    summary="Get user health metrics"
)
def get_user_health_metrics(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate and return user's health metrics. Requires authentication.
    
    Returns:
    - **BMI**: Body Mass Index
    - **Body Fat %**: Calculated using U.S. Navy Method
    - **BMR**: Basal Metabolic Rate (kcal/day)
    - **TDEE**: Total Daily Energy Expenditure (kcal/day)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        metrics = user.get_health_metrics()
        return HealthMetrics(user_id=user_id, **metrics)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Ingredient Endpoints
# ============================================================================

@app.post(
    "/ingredients/",
    response_model=IngredientResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Ingredients"],
    summary="Create a new ingredient"
)
def create_ingredient(
    ingredient: IngredientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new ingredient for use in recipes and pantry."""
    # Check if ingredient already exists
    existing = db.query(Ingredient).filter(Ingredient.name == ingredient.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ingredient already exists")
    
    db_ingredient = Ingredient(**ingredient.model_dump())
    db.add(db_ingredient)
    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient


@app.get(
    "/ingredients/",
    response_model=List[IngredientResponse],
    tags=["Ingredients"],
    summary="List all ingredients"
)
def list_ingredients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get a list of all available ingredients."""
    ingredients = db.query(Ingredient).offset(skip).limit(limit).all()
    return ingredients


@app.get(
    "/ingredients/{ingredient_id}",
    response_model=IngredientResponse,
    tags=["Ingredients"],
    summary="Get ingredient by ID"
)
def get_ingredient(ingredient_id: int, db: Session = Depends(get_db)):
    """Get a specific ingredient by ID."""
    ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return ingredient


# ============================================================================
# Recipe Endpoints
# ============================================================================

@app.post(
    "/recipes/",
    response_model=RecipeResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Recipes"],
    summary="Create a new recipe"
)
def create_recipe(
    recipe: RecipeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new recipe with macro nutritional information.
    
    Optionally include ingredient IDs and quantities.
    """
    db_recipe = Recipe(
        name=recipe.name,
        meal_type=MealType(recipe.meal_type.value),
        kcal=recipe.kcal,
        protein_g=recipe.protein_g,
        carbs_g=recipe.carbs_g,
        fat_g=recipe.fat_g,
        description=recipe.description,
        instructions=recipe.instructions
    )
    
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    
    # Add ingredients if provided
    if recipe.ingredients:
        for ing in recipe.ingredients:
            # Verify ingredient exists
            ingredient = db.query(Ingredient).filter(Ingredient.id == ing.ingredient_id).first()
            if not ingredient:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ingredient with ID {ing.ingredient_id} not found"
                )
            
            recipe_ingredient = RecipeIngredient(
                recipe_id=db_recipe.id,
                ingredient_id=ing.ingredient_id,
                quantity=ing.quantity
            )
            db.add(recipe_ingredient)
        
        db.commit()
        db.refresh(db_recipe)
    
    return _format_recipe_response(db_recipe, db)


@app.get(
    "/recipes/",
    response_model=List[RecipeSimple],
    tags=["Recipes"],
    summary="List all recipes"
)
def list_recipes(
    meal_type: Optional[MealType] = None,
    min_kcal: Optional[float] = None,
    max_kcal: Optional[float] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get a list of recipes with optional filters.
    
    - **meal_type**: Filter by breakfast, lunch, dinner, or snack
    - **min_kcal / max_kcal**: Filter by calorie range
    """
    query = db.query(Recipe)
    
    if meal_type:
        query = query.filter(Recipe.meal_type == meal_type)
    if min_kcal is not None:
        query = query.filter(Recipe.kcal >= min_kcal)
    if max_kcal is not None:
        query = query.filter(Recipe.kcal <= max_kcal)
    
    recipes = query.offset(skip).limit(limit).all()
    return recipes


@app.get(
    "/recipes/{recipe_id}",
    response_model=RecipeResponse,
    tags=["Recipes"],
    summary="Get recipe by ID"
)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    """Get a specific recipe with full details including ingredients."""
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return _format_recipe_response(recipe, db)


def _format_recipe_response(recipe: Recipe, db: Session) -> dict:
    """Helper to format recipe response with ingredient details."""
    ingredients = []
    for ri in recipe.ingredients:
        ingredient = db.query(Ingredient).filter(Ingredient.id == ri.ingredient_id).first()
        if ingredient:
            ingredients.append({
                "ingredient_id": ingredient.id,
                "ingredient_name": ingredient.name,
                "quantity": ri.quantity,
                "unit": ingredient.unit
            })
    
    return {
        "id": recipe.id,
        "name": recipe.name,
        "meal_type": recipe.meal_type,
        "kcal": recipe.kcal,
        "protein_g": recipe.protein_g,
        "carbs_g": recipe.carbs_g,
        "fat_g": recipe.fat_g,
        "description": recipe.description,
        "instructions": recipe.instructions,
        "ingredients": ingredients
    }


# ============================================================================
# Pantry Endpoints
# ============================================================================

@app.post(
    "/pantry/{user_id}",
    response_model=PantryItemResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Pantry"],
    summary="Add item to user's pantry"
)
def add_to_pantry(
    user_id: int,
    item: PantryItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add an ingredient to user's pantry or update quantity if exists."""
    # Only allow users to modify their own pantry
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify ingredient exists
    ingredient = db.query(Ingredient).filter(Ingredient.id == item.ingredient_id).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    # Check if item already in pantry
    existing = db.query(Pantry).filter(
        Pantry.user_id == user_id,
        Pantry.ingredient_id == item.ingredient_id
    ).first()
    
    if existing:
        # Update quantity
        existing.quantity += item.quantity
        db.commit()
        db.refresh(existing)
        pantry_item = existing
    else:
        # Create new entry
        pantry_item = Pantry(
            user_id=user_id,
            ingredient_id=item.ingredient_id,
            quantity=item.quantity
        )
        db.add(pantry_item)
        db.commit()
        db.refresh(pantry_item)
    
    return {
        "id": pantry_item.id,
        "user_id": pantry_item.user_id,
        "ingredient_id": pantry_item.ingredient_id,
        "ingredient_name": ingredient.name,
        "quantity": pantry_item.quantity,
        "unit": ingredient.unit
    }


@app.get(
    "/pantry/{user_id}",
    response_model=List[PantryItemResponse],
    tags=["Pantry"],
    summary="Get user's pantry"
)
def get_pantry(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all items in user's pantry."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    pantry_items = db.query(Pantry).filter(Pantry.user_id == user_id).all()
    
    result = []
    for item in pantry_items:
        ingredient = db.query(Ingredient).filter(Ingredient.id == item.ingredient_id).first()
        result.append({
            "id": item.id,
            "user_id": item.user_id,
            "ingredient_id": item.ingredient_id,
            "ingredient_name": ingredient.name if ingredient else "Unknown",
            "quantity": item.quantity,
            "unit": ingredient.unit if ingredient else "unit"
        })
    
    return result


@app.patch(
    "/pantry/{user_id}/{ingredient_id}",
    response_model=PantryItemResponse,
    tags=["Pantry"],
    summary="Update pantry item quantity"
)
def update_pantry_item(
    user_id: int,
    ingredient_id: int,
    update: PantryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the quantity of an item in user's pantry."""
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    pantry_item = db.query(Pantry).filter(
        Pantry.user_id == user_id,
        Pantry.ingredient_id == ingredient_id
    ).first()
    
    if not pantry_item:
        raise HTTPException(status_code=404, detail="Pantry item not found")
    
    pantry_item.quantity = update.quantity
    db.commit()
    db.refresh(pantry_item)
    
    ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    
    return {
        "id": pantry_item.id,
        "user_id": pantry_item.user_id,
        "ingredient_id": pantry_item.ingredient_id,
        "ingredient_name": ingredient.name if ingredient else "Unknown",
        "quantity": pantry_item.quantity,
        "unit": ingredient.unit if ingredient else "unit"
    }


@app.delete(
    "/pantry/{user_id}/{ingredient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Pantry"],
    summary="Remove item from pantry"
)
def remove_from_pantry(
    user_id: int,
    ingredient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove an ingredient from user's pantry."""
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    pantry_item = db.query(Pantry).filter(
        Pantry.user_id == user_id,
        Pantry.ingredient_id == ingredient_id
    ).first()
    
    if not pantry_item:
        raise HTTPException(status_code=404, detail="Pantry item not found")
    
    db.delete(pantry_item)
    db.commit()


# ============================================================================
# Meal Plan Endpoints
# ============================================================================

@app.post(
    "/plan/generate",
    response_model=MealPlanResponse,
    tags=["Meal Planning"],
    summary="Generate personalized meal plan"
)
def generate_meal_plan(
    request: MealPlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a personalized daily meal plan based on user's TDEE.
    
    The plan:
    - Calculates target calories (TDEE + deficit)
    - Distributes across meals: Breakfast (25%), Lunch (35%), Dinner (30%), Snack (10%)
    - Filters recipes within ±10% of each meal's target
    - Prioritizes recipes where user owns ingredients (pantry scoring)
    
    **Deficit Guidelines:**
    - `-500` kcal = ~0.5 kg/week weight loss
    - `-250` kcal = ~0.25 kg/week (gentle cut)
    - `0` = maintenance
    - `+300` = lean bulk
    """
    engine = DietEngine(db)
    
    try:
        plan = engine.generate_meal_plan(
            user_id=request.user_id,
            deficit=request.deficit
        )
        
        # Convert to response model
        meals = [
            MealSlot(
                meal_type=m["meal_type"],
                target_kcal=m["target_kcal"],
                recommended_recipes=[RecipeSimple(**r) for r in m["recommended_recipes"]]
            )
            for m in plan["meals"]
        ]
        
        return MealPlanResponse(
            user_id=plan["user_id"],
            tdee=plan["tdee"],
            target_daily_kcal=plan["target_daily_kcal"],
            deficit=plan["deficit"],
            meals=meals,
            total_macros=plan["total_macros"]
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================================================
# AI Coach Endpoints
# ============================================================================

@app.post(
    "/ai/chat",
    response_model=ChatResponse,
    tags=["AI Coach"],
    summary="Chat with AI fitness coach"
)
def chat_with_ai(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message to the AI fitness coach.
    
    If user_id is provided, the AI will have access to the user's
    health metrics for personalized responses.
    """
    user_context = None
    
    if request.user_id:
        user = db.query(User).filter(User.id == request.user_id).first()
        if user:
            try:
                metrics = user.get_health_metrics()
                user_context = {
                    "bmi": metrics["bmi"],
                    "body_fat_percent": metrics["body_fat_percent"],
                    "bmr": metrics["bmr"],
                    "tdee": metrics["tdee"],
                    "activity_level": user.activity_level.value,
                    "gender": user.gender,
                    "age": user.age
                }
            except ValueError:
                pass  # Skip context if calculations fail
    
    response = ai_coach.chat(
        user_message=request.message,
        user_context=user_context
    )
    
    return ChatResponse(
        response=response,
        user_context_used=user_context is not None
    )


@app.post(
    "/ai/suggest-recipes",
    response_model=AIRecipeResponse,
    tags=["AI"],
    summary="Get personalized AI recipe suggestions"
)
def suggest_recipes(
    request: SuggestRecipeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate personalized recipe suggestions based on user's ingredients and health profile.
    
    The AI considers:
    - **Ingredients**: What the user has available
    - **TDEE**: To suggest appropriate portion sizes
    - **BMI**: To focus on weight goals
    - **Activity Level**: To adjust protein and calories
    
    Returns 3 recipe suggestions with personalized health tips.
    """
    # Get user's health metrics for personalization
    try:
        metrics = current_user.get_health_metrics()
        user_health = {
            "bmi": metrics["bmi"],
            "body_fat_percent": metrics["body_fat_percent"],
            "bmr": metrics["bmr"],
            "tdee": metrics["tdee"],
            "activity_level": current_user.activity_level.value if current_user.activity_level else "moderate",
            "gender": current_user.gender,
            "age": current_user.age
        }
    except ValueError:
        # Use default values if calculations fail
        user_health = {
            "tdee": 2000,
            "bmi": 22,
            "activity_level": "moderate",
            "body_fat_percent": 20
        }
    
    # Call AI service to generate recipes
    result = ai_coach.suggest_recipes(
        ingredients=request.ingredients,
        user_health=user_health,
        dietary_preferences=request.dietary_preferences,
        meal_type=request.meal_type.value if request.meal_type else None
    )
    
    # Handle errors
    if "error" in result and result["error"]:
        raise HTTPException(
            status_code=500,
            detail=f"AI recipe generation failed: {result['error']}"
        )
    
    return AIRecipeResponse(
        recipes=result.get("recipes", []),
        user_tdee=result.get("user_tdee"),
        user_goal=result.get("user_goal")
    )


# ============================================================================
    return AIRecipeResponse(
        recipes=result.get("recipes", []),
        user_tdee=result.get("user_tdee"),
        user_goal=result.get("user_goal")
    )


# ============================================================================
# Long-Term Meal Plan Endpoints
# ============================================================================

@app.post(
    "/plans/generate",
    response_model=DietPlanResponse,
    tags=["Start"],
    summary="Generate a new personalized meal plan (daily/weekly/monthly)"
)
def generate_diet_plan_endpoint(
    request: PlanGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a new persistent meal plan using AI.
    
    - Archives any existing 'active' plans
    - Creates a new plan based on user profile and goals
    - Returns structured plan data
    """
    # 1. Get user profile data
    try:
        health_metrics = current_user.get_health_metrics()
    except ValueError:
        # Fallback if metrics missing
        health_metrics = {
            "bmi": 22.0, "tdee": 2000, "body_fat_percent": 20, "bmr": 1600
        }
        
    user_profile = {
        "weight_kg": current_user.weight_kg,
        "height_cm": current_user.height_cm,
        "target_weight_kg": current_user.target_weight_kg,
        "age": current_user.age,
        "gender": current_user.gender,
        "activity_level": current_user.activity_level.value if current_user.activity_level else "moderate",
        **health_metrics
    }

    pantry_ingredients = []
    if request.duration in [PlanDuration.daily, PlanDuration.weekly]:
        # Using joinedload for performance if possible, but basic join is fine
        pantry_items = db.query(Pantry).join(Ingredient).filter(Pantry.user_id == current_user.id).all()
        pantry_ingredients = [item.ingredient.name for item in pantry_items]
    
    # 3. Call AI Service
    plan_result = ai_coach.generate_diet_plan(
        user_profile=user_profile,
        duration=request.duration.value,
        dietary_preferences=request.dietary_preferences,
        pantry_ingredients=pantry_ingredients,
        excluded_ingredients=request.excluded_ingredients,
        included_ingredients=request.included_ingredients,
        workout_preference=request.workout_preference
    )
    
    if "error" in plan_result:
        raise HTTPException(
            status_code=500,
            detail=f"Plan generation failed: {plan_result['error']}"
        )
        
    if not plan_result.get("days"):
        raise HTTPException(
            status_code=500,
            detail="AI returned empty plan data"
        )
    
    # 3. Archive existing active plans
    existing_plans = db.query(DietPlan).filter(
        DietPlan.user_id == current_user.id,
        DietPlan.status == "active"
    ).all()
    
    for plan in existing_plans:
        plan.status = "archived"
    
    # 4. Create new plan
    new_plan = DietPlan(
        user_id=current_user.id,
        duration=request.duration.value,
        status="active",
        plan_data=plan_result
    )
    
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    
    return new_plan


@app.get(
    "/plans/current",
    response_model=DietPlanResponse,
    tags=["Start"],
    summary="Get user's current active meal plan"
)
def get_current_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch the most recent 'active' meal plan for the user."""
    plan = db.query(DietPlan).filter(
        DietPlan.user_id == current_user.id,
        DietPlan.status == "active"
    ).order_by(DietPlan.created_at.desc()).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="No active plan found")
        
    return plan


@app.delete(
    "/plans/current",
    status_code=status.HTTP_200_OK,
    tags=["Start"],
    summary="Delete/Archive the current active meal plan"
)
def delete_active_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reset the user's current plan.
    Sets the status of any 'active' plan to 'archived'.
    """
    active_plan = db.query(DietPlan).filter(
        DietPlan.user_id == current_user.id,
        DietPlan.status == "active"
    ).first()
    
    if active_plan:
        active_plan.status = "archived"
        db.commit()
        return {"message": "Plan successfully reset"}
    
    # If no active plan, still return success as the goal (no active plan) is met
    return {"message": "No active plan found to delete"}


@app.get(
    "/plans/history",
    response_model=DietPlanListResponse,
    tags=["Start"],
    summary="Get user's plan history"
)
def get_plan_history(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all meal plans (active and archived) for the user."""
    plans = db.query(DietPlan).filter(
        DietPlan.user_id == current_user.id
    ).order_by(DietPlan.created_at.desc()).offset(skip).limit(limit).all()
    
    return {"plans": plans}


# ============================================================================
# Community & Social Endpoints - Forum
# ============================================================================

@app.get(
    "/forum/posts",
    response_model=List[PostResponse],
    tags=["Forum"],
    summary="List all forum posts"
)
def list_forum_posts(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all forum posts, newest first."""
    posts = db.query(ForumPost).order_by(ForumPost.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for post in posts:
        result.append({
            "id": post.id,
            "user_id": post.user_id,
            "user_name": post.user.name if post.user else None,
            "title": post.title,
            "content": post.content,
            "created_at": post.created_at,
            "comments_count": len(post.comments),
            "comments": []
        })
    return result


@app.post(
    "/forum/posts",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Forum"],
    summary="Create a forum post"
)
def create_forum_post(
    post: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new forum post."""
    db_post = ForumPost(
        user_id=current_user.id,
        title=post.title,
        content=post.content
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    
    return {
        "id": db_post.id,
        "user_id": db_post.user_id,
        "user_name": current_user.name,
        "title": db_post.title,
        "content": db_post.content,
        "created_at": db_post.created_at,
        "comments_count": 0,
        "comments": []
    }


@app.get(
    "/forum/posts/{post_id}",
    response_model=PostResponse,
    tags=["Forum"],
    summary="Get a specific forum post with comments"
)
def get_forum_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a forum post with all its comments."""
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comments = [
        {
            "id": c.id,
            "post_id": c.post_id,
            "user_id": c.user_id,
            "user_name": c.user.name if c.user else None,
            "content": c.content,
            "created_at": c.created_at
        }
        for c in post.comments
    ]
    
    return {
        "id": post.id,
        "user_id": post.user_id,
        "user_name": post.user.name if post.user else None,
        "title": post.title,
        "content": post.content,
        "created_at": post.created_at,
        "comments_count": len(comments),
        "comments": comments
    }


@app.delete(
    "/forum/posts/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Forum"],
    summary="Delete a forum post"
)
def delete_forum_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a forum post. Only the owner or an admin can delete."""
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # CRITICAL: Permission check - owner OR admin only
    if post.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own posts"
        )
    
    db.delete(post)
    db.commit()


@app.post(
    "/forum/posts/{post_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Forum"],
    summary="Add a comment to a post"
)
def add_comment(
    post_id: int,
    comment: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a forum post."""
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    db_comment = ForumComment(
        post_id=post_id,
        user_id=current_user.id,
        content=comment.content
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    return {
        "id": db_comment.id,
        "post_id": db_comment.post_id,
        "user_id": db_comment.user_id,
        "user_name": current_user.name,
        "content": db_comment.content,
        "created_at": db_comment.created_at
    }


# ============================================================================
# Community & Social Endpoints - Direct Messaging
# ============================================================================

@app.post(
    "/messages/send",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Messages"],
    summary="Send a direct message"
)
def send_message(
    message: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a direct message to another user. Must be friends or admin."""
    from sqlalchemy import or_, and_
    
    # Verify receiver exists
    receiver = db.query(User).filter(User.id == message.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Prevent self-messaging
    if message.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")
    
    # Check if users are friends (unless sender is admin)
    if not current_user.is_superuser:
        friendship = db.query(Friendship).filter(
            Friendship.status == FriendshipStatus.accepted,
            or_(
                and_(Friendship.sender_id == current_user.id, Friendship.receiver_id == message.receiver_id),
                and_(Friendship.sender_id == message.receiver_id, Friendship.receiver_id == current_user.id)
            )
        ).first()
        
        if not friendship:
            raise HTTPException(
                status_code=403, 
                detail="You can only message friends. Send a friend request first."
            )
    
    db_message = Message(
        sender_id=current_user.id,
        receiver_id=message.receiver_id,
        content=message.content
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    return {
        "id": db_message.id,
        "sender_id": db_message.sender_id,
        "sender_name": current_user.name,
        "receiver_id": db_message.receiver_id,
        "receiver_name": receiver.name,
        "content": db_message.content,
        "is_read": db_message.is_read,
        "created_at": db_message.created_at
    }


@app.get(
    "/messages/inbox",
    response_model=List[ConversationResponse],
    tags=["Messages"],
    summary="Get inbox conversations"
)
def get_inbox(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all conversations for the current user, grouped by other user."""
    from sqlalchemy import or_, func, case
    
    # Get all messages involving current user
    messages = db.query(Message).filter(
        or_(
            Message.sender_id == current_user.id,
            Message.receiver_id == current_user.id
        )
    ).order_by(Message.created_at.desc()).all()
    
    # Group by conversation partner
    conversations = {}
    for msg in messages:
        other_id = msg.receiver_id if msg.sender_id == current_user.id else msg.sender_id
        
        if other_id not in conversations:
            other_user = db.query(User).filter(User.id == other_id).first()
            unread = db.query(func.count(Message.id)).filter(
                Message.sender_id == other_id,
                Message.receiver_id == current_user.id,
                Message.is_read == False
            ).scalar()
            
            conversations[other_id] = {
                "other_user_id": other_id,
                "other_user_name": other_user.name if other_user else None,
                "last_message": msg.content[:100],
                "last_message_time": msg.created_at,
                "unread_count": unread
            }
    
    return list(conversations.values())


@app.get(
    "/messages/conversation/{user_id}",
    response_model=List[MessageResponse],
    tags=["Messages"],
    summary="Get conversation with a specific user"
)
def get_conversation(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all messages between current user and specified user."""
    from sqlalchemy import or_, and_
    
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
            and_(Message.sender_id == user_id, Message.receiver_id == current_user.id)
        )
    ).order_by(Message.created_at.asc()).all()
    
    # Mark received messages as read
    db.query(Message).filter(
        Message.sender_id == user_id,
        Message.receiver_id == current_user.id,
        Message.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        receiver = db.query(User).filter(User.id == msg.receiver_id).first()
        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "sender_name": sender.name if sender else None,
            "receiver_id": msg.receiver_id,
            "receiver_name": receiver.name if receiver else None,
            "content": msg.content,
            "is_read": msg.is_read,
            "created_at": msg.created_at
        })
    
    return result


@app.get(
    "/messages/users",
    response_model=List[UserSimple],
    tags=["Messages"],
    summary="Get list of users for messaging (Admin only)"
)
def get_users_for_messaging(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of users available for messaging.
    - Admin: All users
    - Regular user: Only accepted friends
    """
    from sqlalchemy import or_, and_
    
    if current_user.is_superuser:
        # Admin can message anyone
        users = db.query(User).filter(User.id != current_user.id).all()
        return [{"id": u.id, "name": u.name, "email": u.email} for u in users]
    
    # Regular users: only return accepted friends
    friendships = db.query(Friendship).filter(
        Friendship.status == FriendshipStatus.accepted,
        or_(
            Friendship.sender_id == current_user.id,
            Friendship.receiver_id == current_user.id
        )
    ).all()
    
    friend_ids = set()
    for f in friendships:
        if f.sender_id == current_user.id:
            friend_ids.add(f.receiver_id)
        else:
            friend_ids.add(f.sender_id)
    
    if not friend_ids:
        return []
    
    friends = db.query(User).filter(User.id.in_(friend_ids)).all()
    return [{"id": u.id, "name": u.name, "email": u.email} for u in friends]


# ============================================================================
# Community & Social Endpoints - Events
# ============================================================================

@app.post(
    "/events",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Events"],
    summary="Create an event (Admin only)"
)
async def create_event(
    request: Request,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    date: str = Form(...),
    location: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new community event with optional image upload. Admin only."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can create events"
        )
    
    # Handle image upload
    image_url = None
    if file and file.filename:
        # Generate unique filename
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Allowed: jpg, jpeg, png, gif, webp"
            )
        
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = UPLOADS_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Generate full URL for the image
        image_url = f"{request.base_url}static/uploads/{unique_filename}"
    
    # Parse date string to datetime
    try:
        event_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
    except ValueError:
        try:
            event_date = datetime.strptime(date, "%Y-%m-%dT%H:%M")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM)"
            )
    
    db_event = Event(
        title=title,
        description=description,
        date=event_date,
        location=location,
        image_url=image_url,
        created_by_id=current_user.id
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    return {
        "id": db_event.id,
        "title": db_event.title,
        "description": db_event.description,
        "date": db_event.date,
        "location": db_event.location,
        "image_url": db_event.image_url,
        "created_by_id": db_event.created_by_id,
        "created_by_name": current_user.name,
        "participant_count": 0,
        "participants": [],
        "created_at": db_event.created_at
    }


@app.get(
    "/events",
    response_model=List[EventResponse],
    tags=["Events"],
    summary="List upcoming events"
)
def list_events(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all upcoming events."""
    from datetime import datetime
    
    events = db.query(Event).filter(
        Event.date >= datetime.utcnow()
    ).order_by(Event.date.asc()).offset(skip).limit(limit).all()
    
    result = []
    for event in events:
        participants = [
            {
                "user_id": p.user_id,
                "user_name": p.user.name if p.user else None,
                "joined_at": p.joined_at
            }
            for p in event.participants
        ]
        result.append({
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "date": event.date,
            "location": event.location,
            "image_url": event.image_url,
            "created_by_id": event.created_by_id,
            "created_by_name": event.created_by.name if event.created_by else None,
            "participant_count": len(participants),
            "participants": participants,
            "created_at": event.created_at
        })
    
    return result


@app.get(
    "/events/{event_id}",
    response_model=EventResponse,
    tags=["Events"],
    summary="Get event details"
)
def get_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific event with participant list."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    participants = [
        {
            "user_id": p.user_id,
            "user_name": p.user.name if p.user else None,
            "joined_at": p.joined_at
        }
        for p in event.participants
    ]
    
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "date": event.date,
        "location": event.location,
        "image_url": event.image_url,
        "created_by_id": event.created_by_id,
        "created_by_name": event.created_by.name if event.created_by else None,
        "participant_count": len(participants),
        "participants": participants,
        "created_at": event.created_at
    }


@app.post(
    "/events/{event_id}/join",
    response_model=dict,
    tags=["Events"],
    summary="Join an event"
)
def join_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join a community event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if already joined
    existing = db.query(EventParticipant).filter(
        EventParticipant.event_id == event_id,
        EventParticipant.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already joined this event")
    
    participant = EventParticipant(
        event_id=event_id,
        user_id=current_user.id
    )
    db.add(participant)
    db.commit()
    
    return {"message": "Successfully joined the event", "event_id": event_id}


@app.delete(
    "/events/{event_id}/leave",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Events"],
    summary="Leave an event"
)
def leave_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave a community event."""
    participant = db.query(EventParticipant).filter(
        EventParticipant.event_id == event_id,
        EventParticipant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="You are not a participant")
    
    db.delete(participant)
    db.commit()


@app.get(
    "/events/{event_id}/participants",
    response_model=List[ParticipantResponse],
    tags=["Events"],
    summary="Get event participants"
)
def get_event_participants(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of participants for an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return [
        {
            "user_id": p.user_id,
            "user_name": p.user.name if p.user else None,
            "joined_at": p.joined_at
        }
        for p in event.participants
    ]


# ============================================================================
# Friendship Endpoints
# ============================================================================

@app.post(
    "/friends/request/{user_id}",
    response_model=FriendResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Friends"],
    summary="Send a friend request"
)
def send_friend_request(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a friend request to another user."""
    from sqlalchemy import or_, and_
    
    # Can't friend yourself
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    
    # Check if user exists
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if friendship already exists (either direction)
    existing = db.query(Friendship).filter(
        or_(
            and_(Friendship.sender_id == current_user.id, Friendship.receiver_id == user_id),
            and_(Friendship.sender_id == user_id, Friendship.receiver_id == current_user.id)
        )
    ).first()
    
    if existing:
        if existing.status == FriendshipStatus.accepted:
            raise HTTPException(status_code=400, detail="You are already friends with this user")
        else:
            raise HTTPException(status_code=400, detail="A friend request already exists")
    
    # Create friend request
    friend_request = Friendship(
        sender_id=current_user.id,
        receiver_id=user_id,
        status=FriendshipStatus.pending
    )
    db.add(friend_request)
    db.commit()
    db.refresh(friend_request)
    
    return {
        "id": friend_request.id,
        "sender_id": friend_request.sender_id,
        "sender_name": current_user.name,
        "receiver_id": friend_request.receiver_id,
        "receiver_name": target_user.name,
        "status": friend_request.status.value,
        "created_at": friend_request.created_at
    }


@app.post(
    "/friends/accept/{request_id}",
    response_model=FriendResponse,
    tags=["Friends"],
    summary="Accept a friend request"
)
def accept_friend_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a pending friend request."""
    friend_request = db.query(Friendship).filter(
        Friendship.id == request_id,
        Friendship.receiver_id == current_user.id,
        Friendship.status == FriendshipStatus.pending
    ).first()
    
    if not friend_request:
        raise HTTPException(status_code=404, detail="Friend request not found or already handled")
    
    friend_request.status = FriendshipStatus.accepted
    db.commit()
    db.refresh(friend_request)
    
    sender = db.query(User).filter(User.id == friend_request.sender_id).first()
    
    return {
        "id": friend_request.id,
        "sender_id": friend_request.sender_id,
        "sender_name": sender.name if sender else None,
        "receiver_id": friend_request.receiver_id,
        "receiver_name": current_user.name,
        "status": friend_request.status.value,
        "created_at": friend_request.created_at
    }


@app.get(
    "/friends/requests",
    response_model=List[FriendResponse],
    tags=["Friends"],
    summary="Get pending friend requests"
)
def get_pending_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending friend requests for the current user."""
    requests = db.query(Friendship).filter(
        Friendship.receiver_id == current_user.id,
        Friendship.status == FriendshipStatus.pending
    ).order_by(Friendship.created_at.desc()).all()
    
    result = []
    for req in requests:
        sender = db.query(User).filter(User.id == req.sender_id).first()
        result.append({
            "id": req.id,
            "sender_id": req.sender_id,
            "sender_name": sender.name if sender else None,
            "receiver_id": req.receiver_id,
            "receiver_name": current_user.name,
            "status": req.status.value,
            "created_at": req.created_at
        })
    
    return result


@app.get(
    "/friends",
    response_model=List[FriendUserResponse],
    tags=["Friends"],
    summary="Get all friends"
)
def get_friends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of all accepted friends."""
    from sqlalchemy import or_
    
    friendships = db.query(Friendship).filter(
        Friendship.status == FriendshipStatus.accepted,
        or_(
            Friendship.sender_id == current_user.id,
            Friendship.receiver_id == current_user.id
        )
    ).all()
    
    result = []
    for f in friendships:
        # Get the other user
        friend_id = f.receiver_id if f.sender_id == current_user.id else f.sender_id
        friend = db.query(User).filter(User.id == friend_id).first()
        
        if friend:
            result.append({
                "user_id": friend.id,
                "user_name": friend.name,
                "user_email": friend.email,
                "friendship_id": f.id,
                "since": f.created_at
            })
    
    return result


@app.get(
    "/friends/check/{user_id}",
    response_model=dict,
    tags=["Friends"],
    summary="Check friendship status with a user"
)
def check_friendship(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if the current user is friends with another user."""
    from sqlalchemy import or_, and_
    
    if user_id == current_user.id:
        return {"status": "self", "is_friend": False, "request_id": None}
    
    friendship = db.query(Friendship).filter(
        or_(
            and_(Friendship.sender_id == current_user.id, Friendship.receiver_id == user_id),
            and_(Friendship.sender_id == user_id, Friendship.receiver_id == current_user.id)
        )
    ).first()
    
    if not friendship:
        return {"status": "none", "is_friend": False, "request_id": None}
    
    if friendship.status == FriendshipStatus.accepted:
        return {"status": "accepted", "is_friend": True, "request_id": friendship.id}
    
    # Pending request
    if friendship.sender_id == current_user.id:
        return {"status": "pending_sent", "is_friend": False, "request_id": friendship.id}
    else:
        return {"status": "pending_received", "is_friend": False, "request_id": friendship.id}


@app.delete(
    "/friends/reject/{request_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Friends"],
    summary="Reject or cancel a friend request"
)
def reject_friend_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a pending friend request or cancel a sent request."""
    from sqlalchemy import or_
    
    friend_request = db.query(Friendship).filter(
        Friendship.id == request_id,
        Friendship.status == FriendshipStatus.pending,
        or_(
            Friendship.receiver_id == current_user.id,  # Rejecting a received request
            Friendship.sender_id == current_user.id     # Canceling a sent request
        )
    ).first()
    
    if not friend_request:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    db.delete(friend_request)
    db.commit()


@app.delete(
    "/friends/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Friends"],
    summary="Unfriend a user"
)
def unfriend_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove an accepted friendship."""
    from sqlalchemy import or_, and_
    
    friendship = db.query(Friendship).filter(
        Friendship.status == FriendshipStatus.accepted,
        or_(
            and_(Friendship.sender_id == current_user.id, Friendship.receiver_id == user_id),
            and_(Friendship.sender_id == user_id, Friendship.receiver_id == current_user.id)
        )
    ).first()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    db.delete(friendship)
    db.commit()


# Health Check
# ============================================================================

@app.get(
    "/health",
    tags=["System"],
    summary="Health check endpoint"
)
def health_check():
    """Check if the API is running."""
    return {"status": "healthy", "version": "1.3.0"}


# ============================================================================
# Run with: uvicorn main:app --reload
# ============================================================================
