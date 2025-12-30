-- Create enum for job types
CREATE TYPE job_type_enum AS ENUM ('new_matches', 'update_results');

-- Add job_type column to import_jobs table
ALTER TABLE import_jobs 
ADD COLUMN job_type job_type_enum NOT NULL DEFAULT 'new_matches';

-- Add index on job_type for faster filtering
CREATE INDEX idx_import_jobs_job_type ON import_jobs(job_type);
