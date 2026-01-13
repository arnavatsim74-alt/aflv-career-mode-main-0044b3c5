-- pg_net is not used by this app and cannot be moved out of public schema.
-- Drop it to satisfy security linter.
DROP EXTENSION IF EXISTS pg_net;
