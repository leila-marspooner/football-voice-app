# backend/migrations/env.py
import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# --- Ensure repo root on sys.path so we can import backend.* ----------------
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

# --- Alembic Config ---------------------------------------------------------
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- Import your SQLAlchemy Base and models ---------------------------------
# --- Import your SQLAlchemy Base and models -------------------------------
import backend.models as models

Base = models.Base
target_metadata = Base.metadata



# --- Resolve DB URL ---------------------------------------------------------
def _get_url_from_settings():
    try:
        from backend.settings import get_settings
        return getattr(get_settings(), "DB_URL", None)
    except Exception:
        return None


def get_url():
    """
    Resolve DB URL in order of precedence:
    1) sqlalchemy.url in alembic.ini
    2) backend.settings.get_settings().DB_URL
    3) $DATABASE_URL env var
    """
    url = config.get_main_option("sqlalchemy.url")
    if url and url.strip():
        return url

    url = _get_url_from_settings()
    if url:
        return url

    url = os.getenv("DATABASE_URL")
    if url:
        return url

    raise RuntimeError(
        "No database URL found. "
        "Set 'sqlalchemy.url' in alembic.ini, "
        "or provide backend.settings.get_settings().DB_URL, "
        "or DATABASE_URL."
    )


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        include_schemas=True,        # <--- ADD THIS
        render_as_batch=True,        # safe for both sqlite/postgres
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    ini_section = config.get_section(config.config_ini_section) or {}
    ini_section["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        ini_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_schemas=True,      # <--- ADD THIS
            render_as_batch=True,      # safe migration mode
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
