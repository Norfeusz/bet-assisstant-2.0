-- Migration: Add import_jobs table for background imports

CREATE TYPE job_status_enum AS ENUM ('pending', 'running', 'paused', 'completed', 'failed', 'rate_limited');

CREATE TABLE import_jobs (
    id SERIAL PRIMARY KEY,
    leagues JSONB NOT NULL,                    -- Array of league IDs: [39, 140, 78]
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    status job_status_enum NOT NULL DEFAULT 'pending',
    progress JSONB DEFAULT '{}'::jsonb,        -- { "current_league": 39, "current_date": "2024-01-15", "completed_leagues": [] }
    total_matches INTEGER DEFAULT 0,
    imported_matches INTEGER DEFAULT 0,
    failed_matches INTEGER DEFAULT 0,
    rate_limit_remaining INTEGER DEFAULT 7500,
    rate_limit_reset_at TIMESTAMPTZ,           -- TIMESTAMPTZ for proper timezone handling
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying active jobs
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_import_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_import_jobs_updated_at
    BEFORE UPDATE ON import_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_import_jobs_updated_at();
