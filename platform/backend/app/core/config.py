import logging
import secrets
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

log = logging.getLogger("ifl.config")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)

    env: Literal["dev", "test", "prod"] = "dev"

    database_url: str = "postgresql+psycopg://ifl_app:ifl_app_dev@localhost:5434/ifl"
    database_url_ops: str = "postgresql+psycopg://ifl_ops:ifl_ops_dev@localhost:5434/ifl"
    database_url_owner: str = "postgresql+psycopg://ifl_owner:ifl_owner_dev@localhost:5434/ifl"
    # Passwords applied to the runtime roles when a migration has to create them.
    app_role_password: str = "ifl_app_dev"
    ops_role_password: str = "ifl_ops_dev"

    jwt_secret: str | None = None
    jwt_algorithm: Literal["HS256"] = "HS256"
    access_token_ttl_seconds: int = 900
    refresh_token_ttl_days: int = 14
    refresh_cookie_name: str = "ifl_refresh"
    refresh_cookie_path: str = "/v1/auth"
    cookie_secure: bool = False

    require_mfa: bool = False
    login_max_failures: int = 10
    login_window_seconds: int = 900

    # Any S3-compatible endpoint: SeaweedFS's S3 gateway locally, AWS S3 elsewhere (ADR-011).
    s3_endpoint_url: str = "http://localhost:8333"
    s3_public_endpoint_url: str = "http://localhost:8333"
    s3_bucket: str = "ifl-local"
    s3_access_key: str = "ifl_local_key"
    s3_secret_key: str = "ifl_local_secret"
    s3_region: str = "us-east-1"
    presign_ttl_seconds: int = 300
    max_upload_bytes: int = 200 * 1024 * 1024

    jobs_mode: Literal["procrastinate", "inline"] = "procrastinate"
    lease_hours: int = 24
    qa_random_seed: int | None = None

    platform_org_name: str = "Infollion"
    cors_origins: str = "http://localhost:3000"

    @property
    def sync_dsn(self) -> str:
        return self.database_url.replace("postgresql+psycopg://", "postgresql://")


_generated_secret = secrets.token_urlsafe(48)


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if not s.jwt_secret:
        if s.env == "prod":
            raise RuntimeError("JWT_SECRET must be set in prod")
        log.warning("JWT_SECRET not set; using a per-process random secret (dev only)")
        s.jwt_secret = _generated_secret
    return s
