-- Add category column to ticket_demands for demand classification
ALTER TABLE public.ticket_demands 
ADD COLUMN category TEXT NOT NULL DEFAULT 'geral';