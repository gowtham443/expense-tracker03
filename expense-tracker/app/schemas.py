from typing import Optional, List
from pydantic import BaseModel, Field

# Category Schemas
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    type: str = Field("expense", pattern="^(expense|income)$")
    color: str = Field("#3B82F6", max_length=20)
    icon: str = Field("tag", max_length=30)
    monthly_budget: float = Field(0.0, ge=0.0)

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    type: Optional[str] = Field(None, pattern="^(expense|income)$")
    color: Optional[str] = None
    icon: Optional[str] = None
    monthly_budget: Optional[float] = Field(None, ge=0.0)

class CategoryResponse(CategoryBase):
    id: int

    class Config:
        from_attributes = True


# Transaction Schemas
class TransactionBase(BaseModel):
    amount: float = Field(..., gt=0)
    type: str = Field("expense", pattern="^(expense|income)$")
    category_id: int
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")  # YYYY-MM-DD
    payment_method: str = Field("Cash", max_length=30)
    note: Optional[str] = Field("", max_length=255)

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[str] = Field(None, pattern="^(expense|income)$")
    category_id: Optional[int] = None
    date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    payment_method: Optional[str] = None
    note: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: int
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


# Analytics Schemas
class DashboardSummary(BaseModel):
    month: str
    total_income: float
    total_expense: float
    net_savings: float
    savings_rate: float
    transaction_count: int

class CategorySpending(BaseModel):
    category_id: int
    category_name: str
    color: str
    icon: str
    type: str
    total_spent: float
    monthly_budget: float
    budget_used_pct: float

class MonthlyTrendPoint(BaseModel):
    month: str  # YYYY-MM
    income: float
    expense: float
    net: float
