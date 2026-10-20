from alembic import context
from sqlalchemy import create_engine, pool

from Frontier_platform.platform.backend.app.core.config import get_settings


def run_migrations_online() -> None:
    url = context.config.attributes.get("url") or get_settings().database_url_owner
    engine = create_engine(url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=None, transaction_per_migration=True)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
