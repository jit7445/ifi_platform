import uuid
from datetime import UTC, datetime

import pyotp
import pytest

from Frontier_platform.platform.backend.app.core.errors import AppError
from Frontier_platform.platform.backend.app.core.ids import uuid7
from Frontier_platform.platform.backend.app.core.pagination import clamp_limit, decode_cursor, encode_cursor
from Frontier_platform.platform.backend.app.core.security import (
    decode_access_token,
    hash_password,
    issue_access_token,
    new_refresh_token,
    sha256_hex,
    verify_password,
    verify_totp,
)


def test_password_roundtrip():
    h = hash_password("correct horse battery staple")
    assert h.startswith("$argon2id$")
    assert verify_password(h, "correct horse battery staple")
    assert not verify_password(h, "wrong")
    assert not verify_password(None, "anything")


def test_access_token_roundtrip_and_tamper():
    uid = uuid.uuid4()
    token, ttl = issue_access_token(uid)
    assert decode_access_token(token) == uid and ttl == 900
    with pytest.raises(AppError) as e:
        decode_access_token(token[:-2] + "xx")
    assert e.value.status == 401


def test_refresh_token_hash():
    raw, digest = new_refresh_token()
    assert sha256_hex(raw.encode()) == digest and len(raw) >= 40


def test_totp():
    secret = pyotp.random_base32()
    assert verify_totp(secret, pyotp.TOTP(secret).now())
    assert not verify_totp(None, "123456")


def test_cursor_roundtrip_and_limits():
    ts, rid = datetime.now(UTC), uuid.uuid4()
    assert decode_cursor(encode_cursor(ts, rid)) == (ts, rid)
    with pytest.raises(AppError):
        decode_cursor("garbage!!")
    assert clamp_limit(None) == 50
    with pytest.raises(AppError):
        clamp_limit(500)


def test_uuid7_is_time_ordered_v7():
    a, b = uuid7(), uuid7()
    assert a.version == 7 and a.variant == uuid.RFC_4122
    assert a.int >> 80 <= b.int >> 80
