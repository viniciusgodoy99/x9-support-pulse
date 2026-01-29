-- Create sla_notifications table to track sent notifications
CREATE TABLE public.sla_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demand_id UUID NOT NULL REFERENCES public.ticket_demands(id) ON DELETE CASCADE,
  notified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notification_type TEXT NOT NULL DEFAULT 'sla_breach'
);

-- Enable RLS
ALTER TABLE public.sla_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all access to sla_notifications" 
ON public.sla_notifications 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_sla_notifications_demand_id ON public.sla_notifications(demand_id);

-- Insert notification settings
INSERT INTO public.settings (key, value) VALUES 
  ('sla_notification_group_id', '120363422213957419@g.us'),
  ('sla_notifications_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;