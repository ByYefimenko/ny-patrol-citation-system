from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from . import auth, crud, models
from .config import settings
from .database import SessionLocal, engine
from .routers import auth as auth_router
from .routers import driver as driver_router
from .routers import lookup as lookup_router
from .routers import notice as notice_router
from .routers import stats as stats_router
from .routers import vehicle as vehicle_router

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name)

# Restrict to the local frontend origins by default. Override via CORS_ORIGINS in .env.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.on_event("startup")
def create_default_admin() -> None:
    # Seed an admin account on first run so the marker can sign in immediately.
    db = SessionLocal()
    try:
        existing = crud.get_user_by_username(db, "admin")
        if not existing:
            crud.create_user(
                db,
                username="admin",
                hashed_password=auth.get_password_hash("password"),
                full_name="System Administrator",
                role="admin",
            )
        elif existing.role != "admin":
            existing.role = "admin"
            db.commit()
    finally:
        db.close()


@app.exception_handler(SQLAlchemyError)
async def handle_db_error(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=500,
        content={"detail": "A database error occurred. Please try again."},
    )


@app.exception_handler(Exception)
async def handle_unexpected(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred."},
    )


app.include_router(auth_router.router)
app.include_router(driver_router.router)
app.include_router(vehicle_router.router)
app.include_router(notice_router.router)
app.include_router(lookup_router.router)
app.include_router(stats_router.router)
