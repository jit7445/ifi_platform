-- Runs once on first start of the local postgres container (docker-entrypoint-initdb.d).
-- ifl_owner (POSTGRES_USER) owns the schema and runs migrations; the runtime roles below never own tables.
CREATE ROLE ifl_app LOGIN NOBYPASSRLS PASSWORD 'ifl_app_dev';
CREATE ROLE ifl_ops LOGIN BYPASSRLS PASSWORD 'ifl_ops_dev';
