"""
Diet & Fitness API - FastAPI Application

A complete backend API for diet and fitness tracking with:
- User management with health calculations (BMI, Body Fat, TDEE)
- Recipe and ingredient management
- Pantry tracking system
- AI-powered meal plan generation
- Placeholder for Gemini AI coach integration

Run with: uvicorn main:app --reload
Docs: http://localhost:8000/docs
"""

import os
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from database import get_db, init_db
from models import User, Recipe, Ingredient, Pantry, RecipeIngredient, ActivityLevel, MealType
from schemas import (
    UserCreate, UserUpdate, UserResponse, HealthMetrics,
    RecipeCreate, RecipeResponse, RecipeSimple,
    IngredientCreate, IngredientResponse,
    PantryItemCreate, PantryItemResponse, PantryUpdate,
    MealPlanRequest, MealPlanResponse, MealSlot,
    ChatRequest, ChatResponse
)
from engine import DietEngine
from ai_service import GeminiCoach

# ============================================================================
# Application Setup
# ============================================================================

app = FastAPI(
    title="Diet & Fitness API",
    description="""
A comprehensive backend API for diet and fitness tracking.

## Features
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
    version="1.0.0",
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
# User Endpoints
# ============================================================================

@app.post(
    "/users/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Users"],
    summary="Create a new user"
)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user with body measurements.
    
    Required measurements for health calculations:
    - height_cm, weight_kg, age, gender
    - waist_cm, neck_cm (for body fat calculation)
    - hip_cm (required for females for body fat calculation)
    """
    # Validate hip measurement for females
    if user.gender.lower() == "female" and user.hip_cm is None:
        raise HTTPException(
            status_code=400,
            detail="Hip measurement is required for female users"
        )
    
    db_user = User(
        name=user.name,
        email=user.email,
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
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get a list of all users with pagination."""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@app.get(
    "/users/{user_id}",
    response_model=UserResponse,
    tags=["Users"],
    summary="Get user by ID"
)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a specific user by their ID."""
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
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    """Update user data (partial update supported)."""
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
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user by ID."""
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
def get_user_health_metrics(user_id: int, db: Session = Depends(get_db)):
    """
    Calculate and return user's health metrics.
    
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
def create_ingredient(ingredient: IngredientCreate, db: Session = Depends(get_db)):
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
def create_recipe(recipe: RecipeCreate, db: Session = Depends(get_db)):
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
def add_to_pantry(user_id: int, item: PantryItemCreate, db: Session = Depends(get_db)):
    """Add an ingredient to user's pantry or update quantity if exists."""
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
def get_pantry(user_id: int, db: Session = Depends(get_db)):
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
    db: Session = Depends(get_db)
):
    """Update the quantity of an item in user's pantry."""
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
def remove_from_pantry(user_id: int, ingredient_id: int, db: Session = Depends(get_db)):
    """Remove an ingredient from user's pantry."""
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
def generate_meal_plan(request: MealPlanRequest, db: Session = Depends(get_db)):
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
def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Send a message to the AI fitness coach.
    
    If user_id is provided, the AI will have access to the user's
    health metrics for personalized responses.
    
    **Note:** This is a placeholder endpoint. Implement the Gemini API
    in `ai_service.py` to enable actual AI responses.
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
    return {"status": "healthy", "version": "1.0.0"}


# ============================================================================
# Run with: uvicorn main:app --reload
# ============================================================================
