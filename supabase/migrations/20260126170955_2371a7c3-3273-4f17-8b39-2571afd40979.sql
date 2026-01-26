-- Add archiving columns to monitored_groups
ALTER TABLE monitored_groups 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

ALTER TABLE monitored_groups 
ADD COLUMN archived_at timestamp with time zone;

-- Create function to archive old pending groups
CREATE OR REPLACE FUNCTION public.archive_old_pending_groups()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE monitored_groups
  SET 
    is_archived = true,
    archived_at = now()
  WHERE 
    pending_classification = true
    AND is_archived = false
    AND created_at < now() - interval '7 days';
END;
$$;