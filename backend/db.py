from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from .settings import get_settings

# Use ASYNC_DB_URL for runtime
def get_engine() -> AsyncEngine:
    settings = get_settings()
    return create_async_engine(settings.ASYNC_DB_URL, echo=False, future=True)

# Global engine + session factory
async_engine: AsyncEngine = get_engine()

AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# FastAPI dependency
async def get_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session
