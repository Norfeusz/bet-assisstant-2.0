-- Add job_type enum
CREATE TYPE job_type_enum AS ENUM ('new_matches', 'update_results');

-- Add job_type column to import_jobs table
ALTER TABLE import_jobs 
ADD COLUMN job_type job_type_enum DEFAULT 'new_matches' NOT NULL;

-- Add index for job_type
CREATE INDEX idx_import_jobs_job_type ON import_jobs(job_type);
