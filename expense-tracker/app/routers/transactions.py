import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

@router.get("", response_model=List[schemas.TransactionResponse])
def get_transactions(
    month: Optional[str] = Query(None, description="Format YYYY-MM"),
    category_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None, pattern="^(expense|income)$"),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction).options(joinedload(models.Transaction.category))

    if month:
        query = query.filter(models.Transaction.date.startswith(month))
    if category_id:
        query = query.filter(models.Transaction.category_id == category_id)
    if type:
        query = query.filter(models.Transaction.type == type)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (models.Transaction.note.ilike(search_filter)) |
            (models.Transaction.payment_method.ilike(search_filter))
        )

    return query.order_by(models.Transaction.date.desc(), models.Transaction.id.desc()).offset(offset).limit(limit).all()

@router.get("/export")
def export_transactions_csv(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction).options(joinedload(models.Transaction.category))
    if month:
        query = query.filter(models.Transaction.date.startswith(month))
    
    transactions = query.order_by(models.Transaction.date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "Type", "Category", "Amount", "Payment Method", "Note"])

    for t in transactions:
        category_name = t.category.name if t.category else "Uncategorized"
        writer.writerow([t.id, t.date, t.type.capitalize(), category_name, t.amount, t.payment_method, t.note])

    output.seek(0)
    filename = f"transactions_{month or 'all'}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("", response_model=schemas.TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(tx_in: schemas.TransactionCreate, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == tx_in.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="Invalid category ID")

    transaction = models.Transaction(**tx_in.model_dump())
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction

@router.put("/{tx_id}", response_model=schemas.TransactionResponse)
def update_transaction(tx_id: int, tx_in: schemas.TransactionUpdate, db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = tx_in.model_dump(exclude_unset=True)
    if "category_id" in update_data and update_data["category_id"] is not None:
        cat = db.query(models.Category).filter(models.Category.id == update_data["category_id"]).first()
        if not cat:
            raise HTTPException(status_code=400, detail="Invalid category ID")

    for key, value in update_data.items():
        setattr(transaction, key, value)

    db.commit()
    db.refresh(transaction)
    return transaction

@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(transaction)
    db.commit()
    return None
