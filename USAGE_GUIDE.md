# Diet & Fitness API - Developer & User Guide

A complete backend API for diet and fitness tracking built with **FastAPI**, **SQLite**, and **SQLAlchemy**.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [API Documentation](#api-documentation)
4. [Health Formula Explanations](#health-formula-explanations)
5. [How to Connect Gemini AI](#how-to-connect-gemini-ai)
6. [Database Schema](#database-schema)

---

## Installation

### Prerequisites
- Python 3.9 or higher
- pip package manager

### Step 1: Create Virtual Environment

```bash
# Navigate to project directory
cd /path/to/diet-fitness-api

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
.\venv\Scripts\activate
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Start the Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Base URL**: `http://localhost:8000`
- **Interactive Docs (Swagger)**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Quick Start

### 1. Create a User

```bash
curl -X POST "http://localhost:8000/users/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "height_cm": 175,
    "weight_kg": 80,
    "gender": "male",
    "age": 30,
    "activity_level": "moderate",
    "waist_cm": 85,
    "neck_cm": 38
  }'
```

### 2. Get Health Metrics

```bash
curl "http://localhost:8000/users/1/health"
```

**Response:**
```json
{
  "user_id": 1,
  "bmi": 26.12,
  "body_fat_percent": 18.47,
  "bmr": 1780.0,
  "tdee": 2759.0
}
```

### 3. Create Recipes

```bash
curl -X POST "http://localhost:8000/recipes/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grilled Chicken Salad",
    "meal_type": "lunch",
    "kcal": 450,
    "protein_g": 35,
    "carbs_g": 20,
    "fat_g": 25
  }'
```

### 4. Generate Meal Plan

```bash
curl -X POST "http://localhost:8000/plan/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "deficit": -500
  }'
```

---

## API Documentation

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/users/` | Create a new user |
| `GET` | `/users/` | List all users |
| `GET` | `/users/{id}` | Get user by ID |
| `PATCH` | `/users/{id}` | Update user data |
| `DELETE` | `/users/{id}` | Delete user |
| `GET` | `/users/{id}/health` | Get calculated health metrics |

### Recipe Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/recipes/` | Create a new recipe |
| `GET` | `/recipes/` | List recipes (with filters) |
| `GET` | `/recipes/{id}` | Get recipe details |

**Query Parameters for `/recipes/`:**
- `meal_type`: Filter by breakfast, lunch, dinner, snack
- `min_kcal`, `max_kcal`: Filter by calorie range

### Ingredient Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ingredients/` | Create ingredient |
| `GET` | `/ingredients/` | List all ingredients |
| `GET` | `/ingredients/{id}` | Get ingredient by ID |

### Pantry Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/pantry/{user_id}` | Add ingredient to pantry |
| `GET` | `/pantry/{user_id}` | List user's pantry |
| `PATCH` | `/pantry/{user_id}/{ingredient_id}` | Update quantity |
| `DELETE` | `/pantry/{user_id}/{ingredient_id}` | Remove from pantry |

### Meal Planning

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/plan/generate` | Generate personalized meal plan |

**Request Body:**
```json
{
  "user_id": 1,
  "deficit": -500
}
```

**Deficit Guidelines:**
- `-500`: ~0.5 kg/week weight loss (recommended)
- `-250`: Gentle cut
- `0`: Maintenance
- `+300`: Lean bulk

### AI Coach

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ai/chat` | Chat with AI fitness coach |

---

## Health Formula Explanations

### Body Mass Index (BMI)

**Formula:**
```
BMI = weight (kg) / height (m)²
```

**Example:** 80 kg, 175 cm
```
BMI = 80 / (1.75)² = 80 / 3.0625 = 26.12
```

**Categories:**
- < 18.5: Underweight
- 18.5 - 24.9: Normal
- 25 - 29.9: Overweight
- ≥ 30: Obese

---

### Body Fat Percentage (U.S. Navy Method)

**Male Formula:**
```
BF% = 495 / (1.0324 - 0.19077 × log₁₀(waist - neck) + 0.15456 × log₁₀(height)) - 450
```

**Female Formula:**
```
BF% = 495 / (1.29579 - 0.35004 × log₁₀(waist + hip - neck) + 0.22100 × log₁₀(height)) - 450
```

> **Note:** Females require hip measurement. All measurements in centimeters.

**Healthy Ranges:**
- Men: 10-20%
- Women: 18-28%

---

### Basal Metabolic Rate (BMR) - Mifflin-St Jeor

The most accurate BMR formula for most people.

**Formula:**
```
BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + s
```

Where `s`:
- Male: +5
- Female: -161

**Example (Male, 80 kg, 175 cm, 30 years):**
```
BMR = (10 × 80) + (6.25 × 175) - (5 × 30) + 5
BMR = 800 + 1093.75 - 150 + 5 = 1748.75 kcal/day
```

---

### Total Daily Energy Expenditure (TDEE)

**Formula:**
```
TDEE = BMR × Activity Multiplier
```

**Activity Multipliers:**
| Level | Multiplier | Description |
|-------|------------|-------------|
| Sedentary | 1.2 | Little or no exercise |
| Light | 1.375 | Light exercise 1-3 days/week |
| Moderate | 1.55 | Moderate exercise 3-5 days/week |
| Very Active | 1.725 | Heavy exercise 6-7 days/week |
| Athlete | 1.9 | Professional athlete, 2x/day training |

**Example (BMR = 1748.75, Moderate activity):**
```
TDEE = 1748.75 × 1.55 = 2710.56 kcal/day
```

---

## How to Connect Gemini AI

This section explains exactly where and how to integrate your Google Gemini API.

### File Location
```
📁 Project Root
└── ai_service.py    ← Edit this file
```

### Step-by-Step Integration

#### 1. Install Google Generative AI Library

```bash
pip install google-generativeai
```

#### 2. Get Your API Key

Visit: https://makersuite.google.com/app/apikey

#### 3. Edit `ai_service.py`

**Location: Lines 35-50 (`__init__` method)**

Replace:
```python
def __init__(self, api_key: Optional[str] = None):
    self.api_key = api_key
    self.model = None  # Placeholder
```

With:
```python
def __init__(self, api_key: Optional[str] = None):
    import google.generativeai as genai
    
    if api_key:
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    else:
        # Use environment variable fallback
        import os
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None
    
    self.api_key = api_key
```

---

**Location: Lines 65-90 (`chat` method)**

Replace the placeholder return statement:
```python
def chat(self, user_message: str, user_context: Optional[Dict] = None) -> str:
    # Placeholder response
    return "[AI Service Not Configured]..."
```

With:
```python
def chat(self, user_message: str, user_context: Optional[Dict] = None) -> str:
    if not self.model:
        return "[AI Service Not Configured] Please provide a valid API key."
    
    # Build context string
    context_str = ""
    if user_context:
        context_str = f"\n\nUser's Health Data:\n{user_context}"
    
    # Build full prompt
    full_prompt = f"{self.system_prompt}{context_str}\n\nUser: {user_message}\n\nCoach:"
    
    try:
        response = self.model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        return f"[AI Error] {str(e)}"
```

---

#### 4. Update `main.py` to Use API Key

**Location: Line 65**

Change:
```python
ai_coach = GeminiCoach()
```

To:
```python
import os
ai_coach = GeminiCoach(api_key=os.getenv("GEMINI_API_KEY"))
```

#### 5. Set Environment Variable

```bash
# Add to your .env file or shell profile
export GEMINI_API_KEY="your-api-key-here"
```

#### 6. Test the Integration

```bash
curl -X POST "http://localhost:8000/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "message": "How many calories should I eat to lose weight?"
  }'
```

---

## Database Schema

```
┌────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│     users      │     │   ingredients    │     │     recipes     │
├────────────────┤     ├──────────────────┤     ├─────────────────┤
│ id             │     │ id               │     │ id              │
│ name           │     │ name             │     │ name            │
│ email          │     │ unit             │     │ meal_type       │
│ height_cm      │     │ kcal_per_unit    │     │ kcal            │
│ weight_kg      │     └────────┬─────────┘     │ protein_g       │
│ gender         │              │               │ carbs_g         │
│ age            │              │               │ fat_g           │
│ activity_level │              │               │ description     │
│ waist_cm       │              │               │ instructions    │
│ neck_cm        │              │               └────────┬────────┘
│ hip_cm         │              │                        │
└───────┬────────┘              │                        │
        │                       │                        │
        │              ┌────────┴────────┐               │
        │              │                 │               │
        ▼              ▼                 ▼               ▼
┌───────────────┐     ┌──────────────────────────────────┐
│    pantry     │     │       recipe_ingredients         │
├───────────────┤     ├──────────────────────────────────┤
│ id            │     │ id                               │
│ user_id (FK)  │     │ recipe_id (FK)                   │
│ ingredient_id │     │ ingredient_id (FK)               │
│ quantity      │     │ quantity                         │
└───────────────┘     └──────────────────────────────────┘
```

---

## Support

For issues or questions, refer to:
- **Swagger UI**: `http://localhost:8000/docs`
- **Source Code**: Check inline comments in each file

---

*Last Updated: January 2026*
