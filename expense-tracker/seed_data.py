import datetime
from app.database import SessionLocal, Base, engine
from app.models import Category, Transaction

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Category).count() > 0:
            print("Database already has categories. Skipping seed.")
            return

        print("Seeding initial categories...")
        categories_data = [
            # Expense Categories
            {"name": "Food & Dining", "type": "expense", "color": "#F59E0B", "icon": "utensils", "monthly_budget": 500.0},
            {"name": "Housing & Rent", "type": "expense", "color": "#EF4444", "icon": "home", "monthly_budget": 1200.0},
            {"name": "Utilities & Bills", "type": "expense", "color": "#3B82F6", "icon": "zap", "monthly_budget": 200.0},
            {"name": "Transportation", "type": "expense", "color": "#10B981", "icon": "car", "monthly_budget": 150.0},
            {"name": "Entertainment", "type": "expense", "color": "#8B5CF6", "icon": "film", "monthly_budget": 150.0},
            {"name": "Shopping", "type": "expense", "color": "#EC4899", "icon": "shopping-bag", "monthly_budget": 250.0},
            {"name": "Healthcare", "type": "expense", "color": "#14B8A6", "icon": "activity", "monthly_budget": 100.0},
            # Income Categories
            {"name": "Salary", "type": "income", "color": "#22C55E", "icon": "briefcase", "monthly_budget": 0.0},
            {"name": "Freelance / Side Gig", "type": "income", "color": "#06B6D4", "icon": "laptop", "monthly_budget": 0.0},
            {"name": "Investments", "type": "income", "color": "#6366F1", "icon": "trending-up", "monthly_budget": 0.0},
        ]

        cat_objs = {}
        for c in categories_data:
            cat = Category(**c)
            db.add(cat)
            db.commit()
            db.refresh(cat)
            cat_objs[cat.name] = cat

        today = datetime.date.today()
        cur_year_month = today.strftime("%Y-%m")

        print("Seeding sample transactions for current month...")
        sample_transactions = [
            {"amount": 3500.0, "type": "income", "category_id": cat_objs["Salary"].id, "date": f"{cur_year_month}-01", "payment_method": "Bank Transfer", "note": "Monthly Salary"},
            {"amount": 1200.0, "type": "expense", "category_id": cat_objs["Housing & Rent"].id, "date": f"{cur_year_month}-02", "payment_method": "Bank Transfer", "note": "Apartment Rent"},
            {"amount": 85.50, "type": "expense", "category_id": cat_objs["Food & Dining"].id, "date": f"{cur_year_month}-03", "payment_method": "Card", "note": "Weekly Grocery Store"},
            {"amount": 45.00, "type": "expense", "category_id": cat_objs["Transportation"].id, "date": f"{cur_year_month}-04", "payment_method": "Card", "note": "Gas refill"},
            {"amount": 65.00, "type": "expense", "category_id": cat_objs["Utilities & Bills"].id, "date": f"{cur_year_month}-05", "payment_method": "UPI", "note": "High-speed Internet"},
            {"amount": 35.00, "type": "expense", "category_id": cat_objs["Entertainment"].id, "date": f"{cur_year_month}-06", "payment_method": "Card", "note": "Movie Night & Snacks"},
            {"amount": 450.0, "type": "income", "category_id": cat_objs["Freelance / Side Gig"].id, "date": f"{cur_year_month}-08", "payment_method": "UPI", "note": "Web design project payout"},
            {"amount": 54.20, "type": "expense", "category_id": cat_objs["Food & Dining"].id, "date": f"{cur_year_month}-09", "payment_method": "Cash", "note": "Dinner with friends"},
        ]

        for t in sample_transactions:
            tx = Transaction(**t)
            db.add(tx)
        
        db.commit()
        print("Database successfully seeded with default categories and sample transactions!")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
