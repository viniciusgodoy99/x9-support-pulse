-- Create enum for ticket status
CREATE TYPE public.ticket_status AS ENUM ('open', 'resolved');

-- Create enum for team member roles
CREATE TYPE public.team_role AS ENUM ('CS', 'Manager', 'Support', 'Admin');

-- Create monitored_groups table
CREATE TABLE public.monitored_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sla_limit_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  role team_role NOT NULL DEFAULT 'CS',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.monitored_groups(id) ON DELETE CASCADE,
  status ticket_status NOT NULL DEFAULT 'open',
  customer_phone TEXT,
  customer_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.team_members(id),
  sentiment TEXT,
  notes TEXT
);

-- Enable Row Level Security (tables will be public for this monitoring app)
ALTER TABLE public.monitored_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (this is an internal monitoring tool)
CREATE POLICY "Allow all access to monitored_groups" 
ON public.monitored_groups FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to team_members" 
ON public.team_members FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to tickets" 
ON public.tickets FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_group_id ON public.tickets(group_id);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX idx_team_members_phone ON public.team_members(phone_number);
CREATE INDEX idx_monitored_groups_whatsapp_id ON public.monitored_groups(whatsapp_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_monitored_groups_updated_at
BEFORE UPDATE ON public.monitored_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;