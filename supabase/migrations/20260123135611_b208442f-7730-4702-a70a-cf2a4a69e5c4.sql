-- Create settings table for global configurations
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default global SLA value (30 minutes)
INSERT INTO public.settings (key, value) VALUES ('global_sla_minutes', '30');

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policy for access
CREATE POLICY "Allow all access to settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();