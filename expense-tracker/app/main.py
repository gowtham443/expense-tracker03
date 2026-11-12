import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import categories, transactions, analytics

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Personal Expense Tracker API",
    description="Local-first REST API for tracking personal income, expenses, and monthly budgets.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(analytics.router)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "Personal Expense Tracker"}

# Mount static frontend
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
