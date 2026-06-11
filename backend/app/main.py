import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

# Load .env file if python-dotenv is available (local dev)
try:
    from dotenv import load_dotenv
    # Walk up from backend/app/ → backend/ → project root to find .env
    _here = os.path.dirname(os.path.abspath(__file__))
    for _parent in [_here, os.path.dirname(_here), os.path.dirname(os.path.dirname(_here))]:
        _env = os.path.join(_parent, ".env")
        if os.path.exists(_env):
            load_dotenv(_env)
            break
except ImportError:
    pass  # python-dotenv not installed — env vars must be set externally (fine for production)

from .database import engine, SessionLocal, Base
from .routers import auth, categories, expenses, budgets, analytics
from .routers.categories import seed_categories


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_categories(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Smart Expense Tracker & Budget Planner API",
    description="REST API for managing user expenses, categories, monthly budgets, and analytics.",
    version="2.0.0",
    lifespan=lifespan
)

# CORS — restrict to your domain in production via ALLOWED_ORIGINS env var
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = (
    [o.strip() for o in allowed_origins_raw.split(",")]
    if allowed_origins_raw != "*"
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")

# Serve frontend static files
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
frontend_dir = os.path.join(project_root, "frontend")

if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
