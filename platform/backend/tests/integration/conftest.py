"""DB-backed tests. Need the compose Postgres (localhost:5434); skipped when it is unreachable.

A fresh `ifl_test` database is created per session and migrated with alembic. Jobs run inline and object storage
is replaced by an in-memory fake, so only Postgres is required."""

import hashlib
import os
from datetime import UTC, datetime, timedelta

from Frontier_platform.platform.backend.app.core import audit, config
import psycopg
import pytest

ADMIN_DSN = os.environ.get("TEST_ADMIN_DSN", "postgresql://ifl_owner:ifl_owner_dev@localhost:5434/postgres")
DB = os.environ.get("TEST_DB_NAME", "ifl_test")
HOSTPART = ADMIN_DSN.split("@", 1)[1].rsplit("/", 1)[0]


def _reachable() -> bool:
    try:
        with psycopg.connect(ADMIN_DSN, connect_timeout=2):
            return True
    except Exception:
        return False


@pytest.fixture(scope="session")
def database():
    if not _reachable():
        pytest.skip(f"Postgres not reachable at {HOSTPART}")
    with psycopg.connect(ADMIN_DSN, autocommit=True) as c:
        c.execute(f'DROP DATABASE IF EXISTS "{DB}" WITH (FORCE)')
        c.execute(f'CREATE DATABASE "{DB}"')
    owner = ADMIN_DSN.rsplit("/", 1)[0] + f"/{DB}"
    os.environ.update({
        "DATABASE_URL": f"postgresql+psycopg://ifl_app:ifl_app_dev@{HOSTPART}/{DB}",
        "DATABASE_URL_OPS": f"postgresql+psycopg://ifl_ops:ifl_ops_dev@{HOSTPART}/{DB}",
        "DATABASE_URL_OWNER": owner.replace("postgresql://", "postgresql+psycopg://"),
        "JOBS_MODE": "inline",
        "ENV": "test",
        "JWT_SECRET": "test-secret-" + "x" * 40,
        "QA_RANDOM_SEED": "1",
    })
    from Frontier_platform.platform.backend.app.core import db

    config.get_settings.cache_clear()
    db.reset_engines()
    audit.clear_cache()

    from alembic import command
    from alembic.config import Config

    here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    cfg = Config(os.path.join(here, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(here, "alembic"))
    cfg.attributes["url"] = os.environ["DATABASE_URL_OWNER"]
    command.upgrade(cfg, "head")

    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from Frontier_platform.platform.backend.app.seed import seed

    eng = create_engine(os.environ["DATABASE_URL_OWNER"])
    with Session(eng) as s:
        seed(s, demo=False)
        s.commit()
    eng.dispose()
    yield
    db.reset_engines()


class FakeStorage:
    def __init__(self):
        self.objects: dict[str, bytes] = {}
        self.last_put_key: str | None = None

    def presign_put(self, key, content_type):
        self.last_put_key = key
        return f"http://fake-s3/{key}?sig=1", {"Content-Type": content_type}, datetime.now(UTC) + timedelta(minutes=5)

    def presign_get(self, key, filename):
        return f"http://fake-s3/{key}?download=1", datetime.now(UTC) + timedelta(minutes=5)

    def head(self, key):
        return {"ContentLength": len(self.objects[key])} if key in self.objects else None

    def sha256_of(self, key):
        data = self.objects[key]
        return hashlib.sha256(data).hexdigest(), len(data)

    def read_bytes(self, key):
        return self.objects[key]

    def put_bytes(self, key, data, content_type):
        self.objects[key] = data


@pytest.fixture
def fake_storage(monkeypatch):
    from Frontier_platform.platform.backend.app.core import storage

    fake = FakeStorage()
    for name in ("presign_put", "presign_get", "head", "sha256_of", "read_bytes", "put_bytes"):
        monkeypatch.setattr(storage, name, getattr(fake, name))
    return fake


@pytest.fixture
def client(database, fake_storage):
    from fastapi.testclient import TestClient

    from Frontier_platform.platform.backend.app.main import create_app

    return TestClient(create_app())


PASSWORD = os.environ.get("SEED_PASSWORD", "ChangeMe-dev-123!")


def login(client, email: str, password: str = PASSWORD) -> dict:
    r = client.post("/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
