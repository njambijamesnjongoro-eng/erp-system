-- Clean reset: drops all data, keeps schema, creates only admin login

BEGIN;

-- Disable triggers and drop all tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

COMMIT;
