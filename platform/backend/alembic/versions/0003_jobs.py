"""procrastinate job queue schema

Revision ID: 0003_jobs
Revises: 0002_security
"""
from alembic import op
from procrastinate.schema import SchemaManager

revision = "0003_jobs"
down_revision = "0002_security"
branch_labels = None
depends_on = None

GRANTS = """
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'procrastinate%' LOOP
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ' || quote_ident(r.tablename) || ' TO ifl_app, ifl_ops';
  END LOOP;
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE 'procrastinate%' LOOP
    EXECUTE 'GRANT USAGE, SELECT, UPDATE ON SEQUENCE ' || quote_ident(r.sequencename) || ' TO ifl_app, ifl_ops';
  END LOOP;
END $$;
"""


def upgrade() -> None:
    conn = op.get_bind().connection.driver_connection
    conn.execute(SchemaManager.get_schema())
    conn.execute(GRANTS)


def downgrade() -> None:
    raise NotImplementedError("drop the database to remove the job queue schema")
