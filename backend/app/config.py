import os
from datetime import timedelta

from dotenv import load_dotenv

# Load .env from the backend folder if present. Falls back to real env vars.
load_dotenv()


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings:
    app_name: str = "New York State Patrol System API"

    sql_alchemy_database_url: str = os.getenv(
        "DATABASE_URL",
        "mysql+mysqlconnector://root:password@localhost/ny_patrol_traffic_db",
    )

    secret_key: str = os.getenv("JWT_SECRET", "dev-only-change-me")
    algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "30"))

    # Frontend origin(s)
    cors_origins: list[str] = _split_csv(
        os.getenv("CORS_ORIGINS", "http://127.0.0.1:5173")
    )


settings = Settings()


def get_access_token_expires() -> timedelta:
    return timedelta(minutes=settings.access_token_expire_minutes)
