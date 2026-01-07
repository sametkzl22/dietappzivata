"""
AI Service - Google Gemini Integration.

This module provides the GeminiCoach class for AI-powered
diet and fitness coaching using Google Gemini API.
"""

from typing import Dict, Optional
import json

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class GeminiCoach:
    """
    AI-powered Diet & Fitness Coach using Google Gemini.
    
    Usage:
        coach = GeminiCoach(api_key="your-api-key")
        response = coach.chat(
            user_message="How many calories should I eat to lose weight?",
            user_context={"tdee": 2500, "goal": "weight_loss"}
        )
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Gemini Coach.
        
        Args:
            api_key: Your Google Gemini API key
        """
        self.api_key = api_key
        self.model = None
        
        if GEMINI_AVAILABLE and api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        
        # System prompt for the AI coach persona
        self.system_prompt = """You are an expert Diet and Fitness Coach AI. Your role is to:
- Provide personalized nutrition advice based on user's health metrics
- Suggest workout routines appropriate for their fitness level
- Explain the science behind dietary recommendations
- Motivate and encourage users on their fitness journey
- Answer questions about calories, macros, and exercise

Always be supportive, accurate, and evidence-based in your responses.
If you don't know something, admit it rather than making up information.
Keep responses concise and actionable."""
    
    def chat(self, user_message: str, user_context: Optional[Dict] = None) -> str:
        """
        Send a message to the AI coach and get a response.
        
        Args:
            user_message: The user's question or message
            user_context: Optional dict with user's health data for personalization
        
        Returns:
            str: The AI coach's response
        """
        if not self.model:
            return (
                "[AI Service Not Configured] "
                "Please ensure google-generativeai is installed and GEMINI_API_KEY is set in .env"
            )
        
        # Build context string
        context_str = ""
        if user_context:
            context_str = f"\n\nUser's Health Data: {user_context}"
        
        # Build full prompt
        full_prompt = f"{self.system_prompt}{context_str}\n\nUser: {user_message}\n\nCoach:"
        
        try:
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            return f"[AI Error] {str(e)}"
    
    def get_personalized_advice(
        self, 
        user_metrics: Dict, 
        advice_type: str = "general"
    ) -> str:
        """
        Get personalized advice based on user's health metrics.
        
        Args:
            user_metrics: Dict containing BMI, TDEE, body fat %, etc.
            advice_type: Type of advice - "general", "diet", "workout", "motivation"
        
        Returns:
            str: Personalized advice from the AI
        """
        prompts = {
            "general": "Give me general health and fitness advice.",
            "diet": "What should I eat today based on my metrics?",
            "workout": "Suggest a workout routine for me.",
            "motivation": "I need some motivation to stay on track."
        }
        
        message = prompts.get(advice_type, prompts["general"])
        return self.chat(message, user_context=user_metrics)
    
    def analyze_meal(self, meal_description: str) -> str:
        """
        Analyze a meal and provide nutritional feedback.
        
        Args:
            meal_description: Description of what the user ate
        
        Returns:
            str: Analysis and feedback on the meal
        """
        message = f"Analyze this meal for nutritional value: {meal_description}"
        return self.chat(message)

    def suggest_recipes(
        self,
        ingredients: list,
        user_health: dict,
        dietary_preferences: str = None,
        meal_type: str = None
    ) -> dict:
        """
        Generate personalized recipe suggestions based on user's ingredients and health profile.
        
        Args:
            ingredients: List of available ingredients
            user_health: Dict with BMI, TDEE, activity_level, body_fat, etc.
            dietary_preferences: Optional dietary preferences (vegetarian, low-carb, etc.)
            meal_type: Optional preferred meal type (breakfast, lunch, dinner, snack)
        
        Returns:
            dict: Parsed recipe suggestions with nutritional info
        """
        if not self.model:
            return {
                "recipes": [],
                "error": "AI Service not configured"
            }
        
        # Build health context
        tdee = user_health.get('tdee', 2000)
        bmi = user_health.get('bmi', 22)
        activity = user_health.get('activity_level', 'moderate')
        body_fat = user_health.get('body_fat_percent', 20)
        
        # Calculate per-meal calories (assuming 3 main meals)
        per_meal_cal = int(tdee / 3)
        
        # Determine health focus based on BMI
        if bmi < 18.5:
            health_focus = "calorie-dense meals to support healthy weight gain"
        elif bmi > 25:
            health_focus = "lighter, nutrient-dense meals for weight management"
        else:
            health_focus = "balanced nutrition for maintaining healthy weight"
        
        # Build prompt
        ingredients_str = ", ".join(ingredients)
        
        prompt = f"""You are a professional nutritionist and chef. Generate 3 healthy recipe suggestions based on:

**Available Ingredients:** {ingredients_str}

**User's Health Profile:**
- Daily Calorie Target (TDEE): {tdee} kcal
- BMI: {bmi}
- Activity Level: {activity}
- Body Fat: {body_fat}%
- Health Focus: {health_focus}
- Target calories per meal: approximately {per_meal_cal} kcal

{f"**Dietary Preference:** {dietary_preferences}" if dietary_preferences else ""}
{f"**Meal Type:** {meal_type}" if meal_type else ""}

**Important Guidelines:**
1. Portion sizes should be appropriate for the user's TDEE
2. Include protein-rich options for the {activity} activity level
3. Each recipe should include a personalized health tip
4. List any common ingredients the user might be missing

**Return ONLY valid JSON in this exact format, no other text:**
{{
  "recipes": [
    {{
      "name": "Recipe Name",
      "time_minutes": 25,
      "calories": {per_meal_cal},
      "protein": "30g",
      "carbs": "45g",
      "fat": "15g",
      "ingredients_used": ["ingredient1", "ingredient2"],
      "missing_ingredients": ["salt", "olive oil"],
      "instructions": ["Step 1...", "Step 2...", "Step 3..."],
      "health_tip": "This recipe is great for your active lifestyle because..."
    }}
  ]
}}"""

        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean up response - remove markdown code blocks if present
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                # Remove first and last lines if they're code block markers
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].strip() == "```":
                    lines = lines[:-1]
                response_text = "\n".join(lines)
            
            # Parse JSON response
            result = json.loads(response_text)
            
            # Add user context to response
            result['user_tdee'] = tdee
            result['user_goal'] = health_focus
            
            return result
            
        except json.JSONDecodeError as e:
            return {
                "recipes": [],
                "error": f"Failed to parse AI response: {str(e)}",
                "raw_response": response_text if 'response_text' in locals() else None
            }
        except Exception as e:
            return {
                "recipes": [],
                "error": f"AI Error: {str(e)}"
            }
