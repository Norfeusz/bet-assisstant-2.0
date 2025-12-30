-- Migration: Fix timezone issue for rate_limit_reset_at
-- Change from TIMESTAMP to TIMESTAMPTZ to properly handle timezones

ALTER TABLE import_jobs 
ALTER COLUMN rate_limit_reset_at TYPE TIMESTAMPTZ 
USING rate_limit_reset_at AT TIME ZONE 'UTC';

-- Now the column stores timestamps with timezone information
-- Worker comparison with NOW() will work correctly across different timezones
