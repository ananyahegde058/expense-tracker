from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/categories",
    tags=["Categories"]
)

DEFAULT_CATEGORIES = [
    {"name": "Food & Groceries", "icon": "🍔", "color": "#FF6B6B"},
    {"name": "Shopping", "icon": "🛍️", "color": "#4DABF7"},
    {"name": "Entertainment", "icon": "🎬", "color": "#FCC419"},
    {"name": "Rent & Bills", "icon": "🏠", "color": "#20C997"},
    {"name": "Transport", "icon": "🚗", "color": "#845EF7"},
    {"name": "Health & Fitness", "icon": "🏥", "color": "#FF8787"},
    {"name": "Education", "icon": "📚", "color": "#FF922B"},
    {"name": "Others", "icon": "⚙️", "color": "#ADB5BD"}
]

def seed_categories(db: Session):
    # Check if we already have categories seeded
    if db.query(models.Category).first() is None:
        for cat in DEFAULT_CATEGORIES:
            db_cat = models.Category(name=cat["name"], icon=cat["icon"], color=cat["color"])
            db.add(db_cat)
        db.commit()

@router.get("", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()
