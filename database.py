"""
Database configuration and session management for Diet & Fitness API.
Uses SQLite with SQLAlchemy ORM.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite database URL - creates a file called 'diet_fitness.db' in the project root
SQLALCHEMY_DATABASE_URL = "sqlite:///./diet_fitness.db"

# Create the SQLAlchemy engine
# check_same_thread=False is needed for SQLite to work with FastAPI's async nature
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# SessionLocal class - each instance will be a database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our models to inherit from
Base = declarative_base()


def init_db():
    """
    Initialize the database by creating all tables.
    Call this on application startup.
    """
    from models import User, Recipe, Ingredient, Pantry, RecipeIngredient
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    Dependency function for FastAPI to get a database session.
    Yields a session and ensures it's closed after the request.
    
    Usage in FastAPI:
        @app.get("/items/")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
