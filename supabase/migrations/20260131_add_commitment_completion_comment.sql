-- Add completion comment field to commitments table

ALTER TABLE commitments
ADD COLUMN completion_comment TEXT;

-- Add completion date field
ALTER TABLE commitments
ADD COLUMN completed_at TIMESTAMPTZ;
