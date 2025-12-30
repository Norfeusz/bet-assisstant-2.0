-- Add 'in_queue' status to job_status_enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'in_queue' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'job_status_enum')
  ) THEN
    -- Add the new value
    EXECUTE 'ALTER TYPE job_status_enum ADD VALUE ''in_queue'' BEFORE ''pending''';
  END IF;
END$$;

-- Update default value for new jobs (needs separate transaction after enum is committed)
-- This will be handled in a follow-up statement

