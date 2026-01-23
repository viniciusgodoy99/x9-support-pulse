-- Add columns to track who resolved each demand
ALTER TABLE ticket_demands
ADD COLUMN resolved_by_name TEXT,
ADD COLUMN resolved_by_phone TEXT;

-- Comment for documentation
COMMENT ON COLUMN ticket_demands.resolved_by_name IS 'Name of the CS who resolved this demand';
COMMENT ON COLUMN ticket_demands.resolved_by_phone IS 'Phone number of the CS who resolved this demand';