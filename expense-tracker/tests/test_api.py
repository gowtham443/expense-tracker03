import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

# In-memory test database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_create_and_get_category():
    # Create category
    res = client.post("/api/categories", json={
        "name": "Coffee & Snacks",
        "type": "expense",
        "color": "#D97706",
        "monthly_budget": 100.0
    })
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Coffee & Snacks"
    assert data["monthly_budget"] == 100.0
    cat_id = data["id"]

    # List categories
    get_res = client.get("/api/categories")
    assert get_res.status_code == 200
    cats = get_res.json()
    assert len(cats) >= 1
    assert any(c["id"] == cat_id for c in cats)

def test_transaction_flow_and_analytics():
    # 1. Create Categories
    c_exp = client.post("/api/categories", json={"name": "Groceries", "type": "expense", "monthly_budget": 300.0}).json()
    c_inc = client.post("/api/categories", json={"name": "Freelance", "type": "income"}).json()

    # 2. Create Transactions
    t1 = client.post("/api/transactions", json={
        "amount": 2000.0,
        "type": "income",
        "category_id": c_inc["id"],
        "date": "2026-11-01",
        "payment_method": "Bank Transfer",
        "note": "Client Project"
    })
    assert t1.status_code == 201

    t2 = client.post("/api/transactions", json={
        "amount": 150.0,
        "type": "expense",
        "category_id": c_exp["id"],
        "date": "2026-11-05",
        "payment_method": "Card",
        "note": "Supermarket"
    })
    assert t2.status_code == 201
    tx2_id = t2.json()["id"]

    # 3. Check Analytics Summary
    summary_res = client.get("/api/analytics/summary?month=2026-11")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_income"] == 2000.0
    assert summary["total_expense"] == 150.0
    assert summary["net_savings"] == 1850.0
    assert summary["transaction_count"] == 2

    # 4. Check Category Spending & Budget Usage
    cat_spending_res = client.get("/api/analytics/by-category?month=2026-11&type=expense")
    assert cat_spending_res.status_code == 200
    spendings = cat_spending_res.json()
    grocery_stat = next(s for s in spendings if s["category_id"] == c_exp["id"])
    assert grocery_stat["total_spent"] == 150.0
    assert grocery_stat["budget_used_pct"] == 50.0  # 150 of 300 is 50%

    # 5. Delete transaction
    del_res = client.delete(f"/api/transactions/{tx2_id}")
    assert del_res.status_code == 204

    # 6. Re-check summary
    summary_res2 = client.get("/api/analytics/summary?month=2026-11")
    assert summary_res2.json()["total_expense"] == 0.0
