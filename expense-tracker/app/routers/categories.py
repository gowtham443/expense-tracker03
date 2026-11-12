from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/categories", tags=["Categories"])

@router.get("", response_model=List[schemas.CategoryResponse])
def get_categories(
    type: Optional[str] = Query(None, pattern="^(expense|income)$"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Category)
    if type:
        query = query.filter(models.Category.type == type)
    return query.order_by(models.Category.name.asc()).all()

@router.post("", response_model=schemas.CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(category_in: schemas.CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Category).filter(models.Category.name == category_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    category = models.Category(**category_in.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.put("/{category_id}", response_model=schemas.CategoryResponse)
def update_category(category_id: int, category_in: schemas.CategoryUpdate, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != category.name:
        existing = db.query(models.Category).filter(models.Category.name == update_data["name"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Category with this name already exists")

    for key, value in update_data.items():
        setattr(category, key, value)
    
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(category)
    db.commit()
    return None
