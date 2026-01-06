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
from datetime import timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from database import get_db, init_db
from models import User, Recipe, Ingredient, Pantry, RecipeIngredient, ActivityLevel, MealType
from schemas import (
    UserCreate, UserUpdate, UserResponse, UserLogin, HealthMetrics,
    Token,
    RecipeCreate, RecipeResponse, RecipeSimple,
    IngredientCreate, IngredientResponse,
    PantryItemCreate, PantryItemResponse, PantryUpdate,
    MealPlanRequest, MealPlanResponse, MealSlot,
    ChatRequest, ChatResponse
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


# ============================================================================
# Health Check
# ============================================================================

@app.get(
    "/health",
    tags=["System"],
    summary="Health check endpoint"
)
def health_check():
    """Check if the API is running."""
    return {"status": "healthy", "version": "1.1.0"}


# ============================================================================
# Run with: uvicorn main:app --reload
# ============================================================================
