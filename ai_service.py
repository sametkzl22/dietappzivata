"""
AI Service - Google Gemini Integration.

This module provides the GeminiCoach class for AI-powered
diet and fitness coaching using Google Gemini API.
"""

from typing import Dict, Optional

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

