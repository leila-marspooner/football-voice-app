from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from .env file."""
    
    # Sync URL for Alembic migrations (psycopg2)
    DB_URL: str = "postgresql+psycopg2://app:app@127.0.0.1:5433/football"
    
    # Async URL for FastAPI runtime (asyncpg)
    ASYNC_DB_URL: str = "postgresql+asyncpg://app:app@127.0.0.1:5433/football"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "devsecret"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"  # Prevents "Extra inputs are not permitted" errors
    )


# Singleton instance
_settings = None


def get_settings() -> Settings:
    """Get cached settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings