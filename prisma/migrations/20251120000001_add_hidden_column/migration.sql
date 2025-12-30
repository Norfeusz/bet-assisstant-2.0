-- Migration: Add hidden column to import_jobs table

ALTER TABLE import_jobs 
ADD COLUMN hidden BOOLEAN DEFAULT FALSE;

-- Index for filtering visible jobs
CREATE INDEX idx_import_jobs_hidden ON import_jobs(hidden);
