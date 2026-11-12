import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True, index=True)
    type = Column(String(10), nullable=False, default="expense")  # 'expense' or 'income'
    color = Column(String(20), default="#3B82F6")  # hex color code
    icon = Column(String(30), default="tag")  # Lucide icon name
    monthly_budget = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    transactions = relationship("Transaction", back_populates="category", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    type = Column(String(10), nullable=False, default="expense")  # 'expense' or 'income'
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), nullable=False, index=True)  # Format: YYYY-MM-DD
    payment_method = Column(String(30), default="Cash")  # 'Cash', 'Card', 'UPI', 'Transfer', etc.
    note = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    category = relationship("Category", back_populates="transactions")
