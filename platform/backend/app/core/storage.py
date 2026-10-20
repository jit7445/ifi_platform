import hashlib
from datetime import UTC, datetime, timedelta
from functools import lru_cache

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from Frontier_platform.platform.backend.app.core.config import get_settings


def _client(endpoint: str):
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=s.s3_access_key,
        aws_secret_access_key=s.s3_secret_key,
        region_name=s.s3_region,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


@lru_cache
def internal_client():
    return _client(get_settings().s3_endpoint_url)


@lru_cache
def public_client():
    # Signs URLs with the browser-reachable host; SigV4 binds the Host header, so the
    # internal client cannot produce URLs that work from outside the compose network.
    return _client(get_settings().s3_public_endpoint_url)


def reset_clients() -> None:
    internal_client.cache_clear()
    public_client.cache_clear()


def bucket() -> str:
    return get_settings().s3_bucket


def ensure_bucket(cors_origins: list[str] | None = None) -> None:
    c = internal_client()
    names = {b["Name"] for b in c.list_buckets().get("Buckets", [])}
    if bucket() not in names:
        c.create_bucket(Bucket=bucket())
    if cors_origins:
        rules = {
            "CORSRules": [
                {
                    "AllowedOrigins": cors_origins,
                    "AllowedMethods": ["GET", "PUT", "HEAD"],
                    "AllowedHeaders": ["*"],
                    "ExposeHeaders": ["ETag"],
                    "MaxAgeSeconds": 3000,
                }
            ]
        }
        try:
            c.put_bucket_cors(Bucket=bucket(), CORSConfiguration=rules)
        except ClientError as e:
            # Some emulators only take CORS from server flags; those are set in docker-compose.
            if e.response.get("Error", {}).get("Code") not in ("NotImplemented", "MethodNotAllowed"):
                raise


def presign_put(key: str, content_type: str) -> tuple[str, dict[str, str], datetime]:
    ttl = get_settings().presign_ttl_seconds
    url = public_client().generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket(), "Key": key, "ContentType": content_type},
        ExpiresIn=ttl,
    )
    return url, {"Content-Type": content_type}, datetime.now(UTC) + timedelta(seconds=ttl)


def presign_get(key: str, filename: str) -> tuple[str, datetime]:
    ttl = get_settings().presign_ttl_seconds
    url = public_client().generate_presigned_url(
        "get_object",
        Params={
            "Bucket": bucket(),
            "Key": key,
            "ResponseContentDisposition": f'attachment; filename="{filename}"',
        },
        ExpiresIn=ttl,
    )
    return url, datetime.now(UTC) + timedelta(seconds=ttl)


def head(key: str) -> dict | None:
    try:
        return internal_client().head_object(Bucket=bucket(), Key=key)
    except ClientError:
        return None


def sha256_of(key: str) -> tuple[str, int]:
    body = internal_client().get_object(Bucket=bucket(), Key=key)["Body"]
    h = hashlib.sha256()
    size = 0
    for chunk in iter(lambda: body.read(1024 * 1024), b""):
        h.update(chunk)
        size += len(chunk)
    return h.hexdigest(), size


def read_bytes(key: str) -> bytes:
    return internal_client().get_object(Bucket=bucket(), Key=key)["Body"].read()


def put_bytes(key: str, data: bytes, content_type: str) -> None:
    internal_client().put_object(Bucket=bucket(), Key=key, Body=data, ContentType=content_type)
