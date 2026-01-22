-- =============================================
-- INFRASTRUCTURE FOR AI-POWERED TICKET ANALYSIS
-- =============================================

-- 1. Create messages table to store all conversation content
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.monitored_groups(id) ON DELETE CASCADE,
  sender_phone TEXT NOT NULL,
  sender_name TEXT,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('cs', 'client')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  whatsapp_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policy for messages
CREATE POLICY "Allow all access to messages"
ON public.messages
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for efficient queries
CREATE INDEX idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX idx_messages_group_id ON public.messages(group_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- 2. Create ticket_demands table for AI-identified demands
CREATE TABLE public.ticket_demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_time_minutes INTEGER,
  sla_exceeded BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on ticket_demands
ALTER TABLE public.ticket_demands ENABLE ROW LEVEL SECURITY;

-- RLS policy for ticket_demands
CREATE POLICY "Allow all access to ticket_demands"
ON public.ticket_demands
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for efficient queries
CREATE INDEX idx_ticket_demands_ticket_id ON public.ticket_demands(ticket_id);
CREATE INDEX idx_ticket_demands_status ON public.ticket_demands(status);

-- 3. Add new columns to tickets table for AI analysis
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS next_analysis_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS last_analysis_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS analysis_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Index for cron job to find tickets needing analysis
CREATE INDEX idx_tickets_next_analysis ON public.tickets(next_analysis_at) WHERE status = 'open';

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_demands;