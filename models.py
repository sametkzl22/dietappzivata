"""
SQLAlchemy ORM Models for Diet & Fitness API.

Contains User, Recipe, Ingredient, Pantry, and RecipeIngredient models
with health calculation methods (BMI, Body Fat %, TDEE).
"""

import math
import enum
from sqlalchemy import Column, Integer, Float, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class ActivityLevel(str, enum.Enum):
    """Activity level enum for TDEE calculation."""
    sedentary = "sedentary"    # Little or no exercise
    light = "light"            # Light exercise 1-3 days/week
    moderate = "moderate"      # Moderate exercise 3-5 days/week
    very = "very"              # Heavy exercise 6-7 days/week
    athlete = "athlete"        # Professional athlete / 2x per day


class MealType(str, enum.Enum):
    """Meal type classification for recipes."""
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"


class User(Base):
    """
    User model with body measurements and health calculation methods.
    
    Implements:
    - BMI (Body Mass Index)
    - Body Fat % (Navy Method)
    - BMR (Basal Metabolic Rate - Mifflin-St Jeor)
    - TDEE (Total Daily Energy Expenditure)
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, nullable=True)
    
    # Body measurements
    height_cm = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    gender = Column(String, nullable=False)  # 'male' or 'female'
    age = Column(Integer, nullable=False)
    activity_level = Column(Enum(ActivityLevel), nullable=False)
    
    # Measurements for body fat calculation
    waist_cm = Column(Float, nullable=False)
    neck_cm = Column(Float, nullable=False)
    hip_cm = Column(Float, nullable=True)  # Required for females

    # Relationships
    pantry_items = relationship("Pantry", back_populates="user")

    def calculate_bmi(self) -> float:
        """
        Calculate Body Mass Index.
        
        Formula: weight (kg) / height (m)²
        
        Returns:
            float: BMI value rounded to 2 decimal places
        """
        height_m = self.height_cm / 100
        bmi = self.weight_kg / (height_m ** 2)
        return round(bmi, 2)

    def calculate_body_fat(self) -> float:
        """
        Calculate Body Fat Percentage using the U.S. Navy Method.
        
        Male Formula:
            495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
        
        Female Formula:
            495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450
        
        Returns:
            float: Body fat percentage rounded to 2 decimal places
            
        Raises:
            ValueError: If female user doesn't have hip measurement
        """
        if self.gender.lower() == "male":
            # Male formula
            body_fat = (
                495 / (
                    1.0324 
                    - 0.19077 * math.log10(self.waist_cm - self.neck_cm) 
                    + 0.15456 * math.log10(self.height_cm)
                ) - 450
            )
        else:
            # Female formula
            if self.hip_cm is None:
                raise ValueError("Hip measurement is required for female body fat calculation")
            
            body_fat = (
                495 / (
                    1.29579 
                    - 0.35004 * math.log10(self.waist_cm + self.hip_cm - self.neck_cm) 
                    + 0.22100 * math.log10(self.height_cm)
                ) - 450
            )
        
        return round(body_fat, 2)

    def calculate_bmr(self) -> float:
        """
        Calculate Basal Metabolic Rate using the Mifflin-St Jeor Equation.
        
        Formula: (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + s
        Where s = +5 for males, -161 for females
        
        Returns:
            float: BMR in kcal/day rounded to 2 decimal places
        """
        s = 5 if self.gender.lower() == "male" else -161
        bmr = (10 * self.weight_kg) + (6.25 * self.height_cm) - (5 * self.age) + s
        return round(bmr, 2)

    def calculate_tdee(self) -> float:
        """
        Calculate Total Daily Energy Expenditure.
        
        Formula: BMR × Activity Multiplier
        
        Activity Multipliers:
        - sedentary: 1.2
        - light: 1.375
        - moderate: 1.55
        - very: 1.725
        - athlete: 1.9
        
        Returns:
            float: TDEE in kcal/day rounded to 2 decimal places
        """
        multipliers = {
            ActivityLevel.sedentary: 1.2,
            ActivityLevel.light: 1.375,
            ActivityLevel.moderate: 1.55,
            ActivityLevel.very: 1.725,
            ActivityLevel.athlete: 1.9,
        }
        
        bmr = self.calculate_bmr()
        multiplier = multipliers.get(self.activity_level, 1.2)
        tdee = bmr * multiplier
        
        return round(tdee, 2)

    def get_health_metrics(self) -> dict:
        """
        Get all calculated health metrics for the user.
        
        Returns:
            dict: Contains bmi, body_fat_percent, bmr, and tdee
        """
        return {
            "bmi": self.calculate_bmi(),
            "body_fat_percent": self.calculate_body_fat(),
            "bmr": self.calculate_bmr(),
            "tdee": self.calculate_tdee(),
        }


class Ingredient(Base):
    """
    Ingredient model for recipe composition and pantry tracking.
    """
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    unit = Column(String, nullable=False)  # e.g., 'grams', 'cups', 'pieces'
    kcal_per_unit = Column(Float, nullable=False)

    # Relationships
    recipe_ingredients = relationship("RecipeIngredient", back_populates="ingredient")
    pantry_entries = relationship("Pantry", back_populates="ingredient")


class Recipe(Base):
    """
    Recipe model with macro nutritional information.
    """
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    meal_type = Column(Enum(MealType), nullable=False)
    
    # Macro nutritional values
    kcal = Column(Float, nullable=False)
    protein_g = Column(Float, nullable=False)
    carbs_g = Column(Float, nullable=False)
    fat_g = Column(Float, nullable=False)
    
    # Optional fields
    description = Column(String, nullable=True)
    instructions = Column(String, nullable=True)

    # Relationships
    ingredients = relationship("RecipeIngredient", back_populates="recipe")


class RecipeIngredient(Base):
    """
    Junction table linking recipes to their required ingredients with quantities.
    """
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    quantity = Column(Float, nullable=False)

    # Relationships
    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="recipe_ingredients")


class Pantry(Base):
    """
    User's pantry - tracks ingredients the user owns.
    """
    __tablename__ = "pantry"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    quantity = Column(Float, nullable=False)

    # Relationships
    user = relationship("User", back_populates="pantry_items")
    ingredient = relationship("Ingredient", back_populates="pantry_entries")
