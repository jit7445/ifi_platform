"""Operational commands: python -m app.cli {migrate,seed,init-storage,openapi}"""

import argparse
import json
import sys
from pathlib import Path


def migrate() -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(Path(__file__).resolve().parent.parent / "alembic.ini"))
    command.upgrade(cfg, "head")


def init_storage() -> None:
    from Frontier_platform.platform.backend.app.core import storage
    from Frontier_platform.platform.backend.app.core.config import get_settings

    origins = [o.strip() for o in get_settings().cors_origins.split(",") if o.strip()]
    storage.ensure_bucket(origins)
    print(f"bucket {storage.bucket()} ready (CORS origins: {', '.join(origins)})")


def openapi(path: str) -> None:
    from Frontier_platform.platform.backend.app.main import app

    Path(path).write_text(json.dumps(app.openapi(), indent=2, sort_keys=False) + "\n")
    print(f"wrote {path}")


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="app.cli")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("migrate")
    s = sub.add_parser("seed")
    s.add_argument("--no-demo", action="store_true")
    sub.add_parser("init-storage")
    o = sub.add_parser("openapi")
    o.add_argument("--out", default="openapi.json")
    args = ap.parse_args(argv)
    if args.cmd == "migrate":
        migrate()
    elif args.cmd == "seed":
        from Frontier_platform.platform.backend.app.seed import password, run

        out = run(demo=not args.no_demo)
        print(json.dumps(out, indent=2))
        print(f"seeded users share the password from SEED_PASSWORD (default {password()!r})", file=sys.stderr)
    elif args.cmd == "init-storage":
        init_storage()
    elif args.cmd == "openapi":
        openapi(args.out)


if __name__ == "__main__":
    main()
