import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(
    month: Optional[str] = Query(None, description="Format YYYY-MM"),
    db: Session = Depends(get_db)
):
    if not month:
        now = datetime.datetime.now()
        month = now.strftime("%Y-%m")

    # Fetch income and expenses for month
    txs = db.query(models.Transaction).filter(models.Transaction.date.startswith(month)).all()

    total_income = sum(t.amount for t in txs if t.type == "income")
    total_expense = sum(t.amount for t in txs if t.type == "expense")
    net_savings = total_income - total_expense
    savings_rate = round((net_savings / total_income * 100), 1) if total_income > 0 else 0.0

    return schemas.DashboardSummary(
        month=month,
        total_income=round(total_income, 2),
        total_expense=round(total_expense, 2),
        net_savings=round(net_savings, 2),
        savings_rate=savings_rate,
        transaction_count=len(txs)
    )

@router.get("/by-category", response_model=List[schemas.CategorySpending])
def get_spending_by_category(
    month: Optional[str] = Query(None, description="Format YYYY-MM"),
    type: str = Query("expense", pattern="^(expense|income)$"),
    db: Session = Depends(get_db)
):
    if not month:
        now = datetime.datetime.now()
        month = now.strftime("%Y-%m")

    categories = db.query(models.Category).filter(models.Category.type == type).all()
    results = []

    for cat in categories:
        spent = db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0)).filter(
            models.Transaction.category_id == cat.id,
            models.Transaction.date.startswith(month)
        ).scalar()

        budget = cat.monthly_budget or 0.0
        used_pct = round((spent / budget * 100), 1) if budget > 0 else 0.0

        results.append(schemas.CategorySpending(
            category_id=cat.id,
            category_name=cat.name,
            color=cat.color or "#3B82F6",
            icon=cat.icon or "tag",
            type=cat.type,
            total_spent=round(float(spent), 2),
            monthly_budget=round(budget, 2),
            budget_used_pct=used_pct
        ))

    # Sort by total spent descending
    results.sort(key=lambda x: x.total_spent, reverse=True)
    return results

@router.get("/monthly-trend", response_model=List[schemas.MonthlyTrendPoint])
def get_monthly_trend(
    months_count: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db)
):
    # Determine the past N months
    today = datetime.date.today()
    target_months = []
    for i in range(months_count - 1, -1, -1):
        # Subtract months
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        target_months.append(f"{year:04d}-{month:02d}")

    trend_points = []
    for m in target_months:
        txs = db.query(models.Transaction).filter(models.Transaction.date.startswith(m)).all()
        inc = sum(t.amount for t in txs if t.type == "income")
        exp = sum(t.amount for t in txs if t.type == "expense")
        trend_points.append(schemas.MonthlyTrendPoint(
            month=m,
            income=round(inc, 2),
            expense=round(exp, 2),
            net=round(inc - exp, 2)
        ))

    return trend_points
