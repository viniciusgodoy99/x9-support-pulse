-- Add columns for client group classification
ALTER TABLE public.monitored_groups 
ADD COLUMN is_client_group boolean NOT NULL DEFAULT false,
ADD COLUMN pending_classification boolean NOT NULL DEFAULT true;

-- Update existing groups to not be pending (already manually added)
UPDATE public.monitored_groups SET pending_classification = false;