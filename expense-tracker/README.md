# ExpenseFlow - Personal Expense Tracker

A modern, fast, and local-first personal finance and expense tracking web application built with **FastAPI**, **SQLite**, **Tailwind CSS**, and **Chart.js**.

---

## ✨ Features

- **Summary Dashboard**: Track your Net Balance, Monthly Income, Monthly Expense, and Savings Rate % at a glance.
- **Visual Analytics**:
  - **Spending by Category**: Interactive doughnut chart breaking down your expense distribution.
  - **Cash Flow Trend**: 6-month comparative bar chart of income vs expenses.
- **Budget Tracking**: Set monthly spending limits per category with progress bars and automatic threshold warnings (Green &rarr; Amber &rarr; Red pulse when over budget).
- **Multi-Currency Support**: Instant one-click toggle between `$ USD`, `₹ INR`, `€ EUR`, and `£ GBP`.
- **Transactions Management**:
  - Filter by month, transaction type (Income/Expense), or category.
  - Real-time search across notes and payment methods (Cash, Card, UPI, Bank Transfer).
  - Add, edit, and delete transactions.
  - Export transactions to CSV.
- **Local & Private**: All data is stored locally in `expenses.db` (SQLite). No cloud accounts or telemetry required.

---

## 🚀 Quick Start

### Option 1: One-Click Launch (Windows)
Double-click `start.bat`. It will automatically configure the virtual environment, install requirements, and open the web app in your default browser.

### Option 2: Manual Run
1. Open PowerShell or Command Prompt in this folder:
   ```powershell
   cd C:\Users\mghug\expense-tracker
   ```
2. Create and activate a virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Run the app:
   ```powershell
   python run.py
   ```
5. Open your browser at [http://localhost:8000](http://localhost:8000).

---

## 📁 Project Structure

```
expense-tracker/
├── app/
│   ├── __init__.py
│   ├── database.py         # SQLAlchemy engine and SQLite session
│   ├── models.py           # Category & Transaction database models
│   ├── schemas.py          # Pydantic validation schemas
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── categories.py   # Category CRUD endpoints
│   │   ├── transactions.py # Transaction CRUD & CSV export
│   │   └── analytics.py    # Summary, budget progress & trends
│   └── main.py             # FastAPI app & static file mounting
├── static/
│   ├── index.html          # Responsive Tailwind CSS dashboard
│   ├── styles.css          # Animations and custom styling
│   └── app.js              # State handling, Chart.js, modal logic
├── tests/
│   ├── __init__.py
│   └── test_api.py         # Automated API and business logic tests
├── seed_data.py            # Pre-populates starter categories and demo data
├── run.py                  # One-click Python launcher with browser launch
├── start.bat               # Windows batch launcher
├── requirements.txt        # Python package dependencies
└── README.md
```

---

## 🔌 API Documentation

Once the server is running, visit:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
