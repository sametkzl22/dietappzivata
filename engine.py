"""
Diet Engine - Meal Plan Generation Logic.

This module handles the core business logic for generating personalized
meal plans based on user's TDEE and available recipes.
"""

from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from models import User, Recipe, Pantry, RecipeIngredient, MealType


class DietEngine:
    """
    Diet Engine for generating personalized meal plans.
    
    Features:
    - Calculates target calories based on TDEE and deficit
    - Distributes calories across meals (Breakfast 25%, Lunch 35%, Dinner 30%, Snack 10%)
    - Filters recipes by calorie targets with ±10% tolerance
    - Scores recipes by pantry matching (prioritizes ingredients user owns)
    """
    
    # Meal distribution percentages
    MEAL_DISTRIBUTION = {
        MealType.breakfast: 0.25,  # 25%
        MealType.lunch: 0.35,      # 35%
        MealType.dinner: 0.30,     # 30%
        MealType.snack: 0.10,      # 10%
    }
    
    def __init__(self, db: Session):
        """
        Initialize the Diet Engine.
        
        Args:
            db: SQLAlchemy database session
        """
        self.db = db
    
    def calculate_target_calories(self, user: User, deficit: int = -500) -> float:
        """
        Calculate target daily calories based on TDEE and deficit.
        
        Args:
            user: User model instance
            deficit: Calorie adjustment (negative for weight loss, positive for gain)
                     Default is -500 for ~0.5kg/week weight loss
        
        Returns:
            float: Target daily calorie intake
        """
        tdee = user.calculate_tdee()
        target = tdee + deficit
        
        # Ensure minimum safe calorie intake
        min_calories = 1200 if user.gender.lower() == "female" else 1500
        return max(target, min_calories)
    
    def get_meal_calorie_targets(self, total_calories: float) -> Dict[MealType, float]:
        """
        Distribute total calories across meal types.
        
        Args:
            total_calories: Total daily calorie target
        
        Returns:
            Dict mapping meal types to their calorie targets
        """
        return {
            meal_type: total_calories * percentage
            for meal_type, percentage in self.MEAL_DISTRIBUTION.items()
        }
    
    def filter_recipes_by_calories(
        self, 
        meal_type: MealType, 
        target_kcal: float, 
        tolerance: float = 0.10
    ) -> List[Recipe]:
        """
        Filter recipes that match the calorie target within tolerance.
        
        Args:
            meal_type: Type of meal to filter for
            target_kcal: Target calories for the meal
            tolerance: Acceptable deviation from target (default ±10%)
        
        Returns:
            List of recipes matching the criteria
        """
        min_kcal = target_kcal * (1 - tolerance)
        max_kcal = target_kcal * (1 + tolerance)
        
        recipes = self.db.query(Recipe).filter(
            Recipe.meal_type == meal_type,
            Recipe.kcal >= min_kcal,
            Recipe.kcal <= max_kcal
        ).all()
        
        return recipes
    
    def calculate_pantry_score(self, recipe: Recipe, user_id: int) -> float:
        """
        Calculate how well a recipe matches user's pantry.
        
        Score = (number of owned ingredients / total ingredients) × 100
        
        Args:
            recipe: Recipe to score
            user_id: User ID to check pantry against
        
        Returns:
            float: Pantry match score (0-100 percentage)
        """
        # Get recipe ingredients
        recipe_ingredients = self.db.query(RecipeIngredient).filter(
            RecipeIngredient.recipe_id == recipe.id
        ).all()
        
        if not recipe_ingredients:
            return 100.0  # No ingredients needed = 100% match
        
        # Get user's pantry ingredient IDs
        user_pantry = self.db.query(Pantry).filter(
            Pantry.user_id == user_id
        ).all()
        
        pantry_ingredient_ids = {item.ingredient_id for item in user_pantry}
        
        # Count matching ingredients
        total_ingredients = len(recipe_ingredients)
        owned_ingredients = sum(
            1 for ri in recipe_ingredients 
            if ri.ingredient_id in pantry_ingredient_ids
        )
        
        score = (owned_ingredients / total_ingredients) * 100
        return round(score, 2)
    
    def get_scored_recipes(
        self, 
        meal_type: MealType, 
        target_kcal: float, 
        user_id: int,
        tolerance: float = 0.10
    ) -> List[Dict]:
        """
        Get recipes filtered by calories and scored by pantry match.
        
        Args:
            meal_type: Type of meal
            target_kcal: Target calories
            user_id: User ID for pantry matching
            tolerance: Calorie tolerance (default ±10%)
        
        Returns:
            List of recipe dicts with pantry_score, sorted by score descending
        """
        recipes = self.filter_recipes_by_calories(meal_type, target_kcal, tolerance)
        
        scored_recipes = []
        for recipe in recipes:
            score = self.calculate_pantry_score(recipe, user_id)
            scored_recipes.append({
                "id": recipe.id,
                "name": recipe.name,
                "meal_type": recipe.meal_type,
                "kcal": recipe.kcal,
                "protein_g": recipe.protein_g,
                "carbs_g": recipe.carbs_g,
                "fat_g": recipe.fat_g,
                "pantry_score": score,
            })
        
        # Sort by pantry score (highest first)
        scored_recipes.sort(key=lambda x: x["pantry_score"], reverse=True)
        
        return scored_recipes
    
    def generate_meal_plan(
        self, 
        user_id: int, 
        deficit: int = -500
    ) -> Dict:
        """
        Generate a complete daily meal plan for a user.
        
        Args:
            user_id: ID of the user
            deficit: Calorie adjustment from TDEE (default -500 kcal)
        
        Returns:
            Dict containing the meal plan with recommendations for each meal
        
        Raises:
            ValueError: If user not found
        """
        # Get user
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        # Calculate targets
        tdee = user.calculate_tdee()
        target_daily_kcal = self.calculate_target_calories(user, deficit)
        meal_targets = self.get_meal_calorie_targets(target_daily_kcal)
        
        # Generate meal slots
        meals = []
        total_protein = 0
        total_carbs = 0
        total_fat = 0
        
        for meal_type, target_kcal in meal_targets.items():
            recipes = self.get_scored_recipes(
                meal_type=meal_type,
                target_kcal=target_kcal,
                user_id=user_id
            )
            
            meals.append({
                "meal_type": meal_type.value,
                "target_kcal": round(target_kcal, 2),
                "recommended_recipes": recipes[:5],  # Top 5 recommendations
            })
            
            # Sum macros from top recommendation (if exists)
            if recipes:
                top_recipe = recipes[0]
                total_protein += top_recipe["protein_g"]
                total_carbs += top_recipe["carbs_g"]
                total_fat += top_recipe["fat_g"]
        
        return {
            "user_id": user_id,
            "tdee": tdee,
            "target_daily_kcal": target_daily_kcal,
            "deficit": deficit,
            "meals": meals,
            "total_macros": {
                "protein_g": round(total_protein, 2),
                "carbs_g": round(total_carbs, 2),
                "fat_g": round(total_fat, 2),
                "note": "Macros calculated from top recipe recommendations"
            }
        }
