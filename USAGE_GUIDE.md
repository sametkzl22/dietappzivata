# NutriPlan - Usage Guide

> A comprehensive guide for developers working with the Diet & Fitness Full Stack Application.

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Installation & Setup](#2-installation--setup)
3. [Features Walkthrough](#3-features-walkthrough)
4. [API Reference](#4-api-reference)

---

## 1. Project Overview

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend** | FastAPI (Python) | REST API, authentication, business logic |
| **Frontend** | Next.js 14 (React) | Modern UI with App Router |
| **Database** | SQLite + SQLAlchemy | Lightweight persistence |
| **AI** | Google Gemini | Intelligent nutrition coaching |
| **Styling** | Tailwind CSS | Utility-first styling |

### Key Features

- **🔐 JWT Authentication** - Secure login/registration with admin role management
- **🛡️ Admin Panel** - User management dashboard for superusers
- **🍳 Smart Pantry** - Track ingredients and get matched recipes
- **🤖 AI Coach** - Chat with Gemini for personalized nutrition advice
- **📊 Health Metrics** - BMI, Body Fat %, BMR, and TDEE calculations
- **🍽️ Meal Planning** - AI-generated daily meal plans based on your goals

### Project Structure

```
dietappzivata/
├── backend/
│   ├── main.py           # FastAPI application
│   ├── models.py         # SQLAlchemy ORM models
│   ├── schemas.py        # Pydantic validation schemas
│   ├── auth.py           # JWT authentication logic
│   ├── engine.py         # Diet plan generation engine
│   ├── ai_service.py     # Gemini AI integration
│   └── database.py       # Database configuration
├── frontend/
│   ├── src/app/          # Next.js pages
│   ├── src/components/   # Reusable React components
│   └── src/lib/api.ts    # API client with auth
└── requirements.txt      # Python dependencies
```

---

## 2. Installation & Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Google Gemini API Key (get from [Google AI Studio](https://makersuite.google.com/app/apikey))

---

### Backend Setup

#### Step 1: Create Virtual Environment

```bash
cd dietappzivata
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# or: .\venv\Scripts\activate  # Windows
```

#### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

**Key Libraries:**

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `sqlalchemy` | ORM for database |
| `python-jose[cryptography]` | JWT token handling |
| `passlib[bcrypt]` | Password hashing |
| `google-generativeai` | Gemini AI SDK |
| `python-multipart` | Form data support |
| `pydantic-settings` | Environment config |

#### Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Required: Get from Google AI Studio
GEMINI_API_KEY=your-gemini-api-key-here

# JWT Configuration
SECRET_KEY=your-super-secret-key-change-in-production-12345
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

> ⚠️ **Security Note:** Never commit `.env` to version control. Use a strong, random `SECRET_KEY` in production.

#### Step 4: Run the Backend

```bash
uvicorn main:app --reload
```

The API will be available at:
- **API:** http://localhost:8000
- **Docs:** http://localhost:8000/docs (Swagger UI)
- **ReDoc:** http://localhost:8000/redoc

---

### Frontend Setup

#### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

#### Step 2: Configure API URL (Optional)

Create `.env.local` if backend runs on a different port:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Step 3: Run the Frontend

```bash
npm run dev
```

The frontend will be available at: http://localhost:3000

---

## 3. Features Walkthrough

### 🔐 Registration

1. Navigate to `/register` or click **"Get Started"**
2. Complete the 3-step onboarding:
   - **Step 1 - Account:** Name, email, password
   - **Step 2 - Body Info:** Gender, age, height, weight, activity level
   - **Step 3 - Measurements:** Waist, neck, hip (females only)
3. Upon completion, you're automatically logged in

> 💡 Body measurements are used to calculate BMI, body fat %, and daily calorie needs.

---

### 🔑 Login

1. Navigate to `/login`
2. Enter your email and password
3. On success, you're redirected to the Dashboard
4. JWT token is stored in `localStorage` for subsequent requests

---

### 📊 Dashboard

The main dashboard displays:

| Section | Description |
|---------|-------------|
| **Health Metrics** | Your BMI, daily calories, body fat %, and weight |
| **Today's Nutrition Plan** | 4 meal cards (Breakfast, Lunch, Dinner, Snack) |
| **Daily Macros** | Total protein, carbs, and fat summary |

**Generating a New Plan:**
- Click the **"Generate New Plan"** button
- The system calculates your TDEE and creates meals within your calorie target

---

### 🍳 Pantry Manager

Access via the Dashboard or Profile:

1. **Add Ingredients:** Search and add items you have at home
2. **Update Quantities:** Adjust amounts as you use ingredients
3. **Recipe Matching:** The meal planner prioritizes recipes using your pantry items

---

### 🤖 AI Coach

The floating chat widget (bottom-right corner):

1. Click the chat bubble to open
2. Ask nutrition questions like:
   - *"What are good protein sources for vegetarians?"*
   - *"How can I hit my protein goal today?"*
   - *"Suggest a low-carb breakfast"*
3. The AI has context about your health metrics for personalized responses

---

### 🛡️ Admin Panel

**Access:** Only users with `is_superuser = True` can access `/admin`

**Features:**

| Tab | Functionality |
|-----|---------------|
| **Users** | View all users, toggle admin status, activate/deactivate accounts |
| **Recipes** | Manage recipe database (coming soon) |
| **Analytics** | View platform statistics (coming soon) |

**Making a User Admin:**

Currently, set manually in the database:

```sql
UPDATE users SET is_superuser = 1 WHERE email = 'admin@example.com';
```

Or via Python:

```python
# In a Python shell with database access
user.is_superuser = True
db.commit()
```

---

## 4. API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/signup` | Register new user |
| `POST` | `/auth/login` | Login and get JWT token |
| `GET` | `/users/me` | Get current user profile |
| `GET` | `/users/me/health` | Get current user health metrics |

**Login Request:**
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=yourpassword"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

---

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/users/` | List all users | ✅ |
| `GET` | `/users/{id}` | Get user by ID | ✅ |
| `PATCH` | `/users/{id}` | Update user | ✅ |
| `DELETE` | `/users/{id}` | Delete user | ✅ |
| `GET` | `/users/{id}/health` | Get health metrics | ✅ |

---

### Meal Planning

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/plan/generate` | Generate daily meal plan | ✅ |

**Request Body:**
```json
{
  "user_id": 1,
  "deficit": -500
}
```

**Deficit Values:**
- `-500`: Lose ~0.5kg/week
- `-250`: Gentle cut
- `0`: Maintenance
- `+300`: Lean bulk

---

### Pantry

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/pantry/{user_id}` | Add item to pantry | ✅ |
| `GET` | `/pantry/{user_id}` | Get user's pantry | ✅ |
| `PATCH` | `/pantry/{user_id}/{ingredient_id}` | Update quantity | ✅ |
| `DELETE` | `/pantry/{user_id}/{ingredient_id}` | Remove item | ✅ |

---

### Admin (Superuser Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/users` | List all users with stats |
| `PATCH` | `/admin/users/{id}/toggle-admin` | Toggle superuser status |
| `PATCH` | `/admin/users/{id}/toggle-active` | Activate/deactivate user |

---

### AI Coach

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/ai/chat` | Chat with AI coach | ✅ |

**Request:**
```json
{
  "message": "What should I eat for breakfast?",
  "user_id": 1
}
```

---

## 🚀 Quick Start Summary

```bash
# Terminal 1: Backend
cd dietappzivata
source venv/bin/activate
uvicorn main:app --reload

# Terminal 2: Frontend
cd dietappzivata/frontend
npm run dev
```

Open http://localhost:3000 and start using the app!

---

## 📞 Support

For issues or questions:
1. Check the API docs at `/docs`
2. Review error messages in the browser console
3. Check backend logs for detailed error traces

---

*Last updated: January 2026*
