-- Create table for WhatsApp instances
CREATE TABLE public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  api_token TEXT NOT NULL,
  instance_name TEXT,
  phone_number TEXT,
  profile_name TEXT,
  profile_picture_url TEXT,
  status TEXT DEFAULT 'disconnected',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Allow all access (no auth in this app)
CREATE POLICY "Allow all access to whatsapp_instances"
ON public.whatsapp_instances
FOR ALL
USING (true)
WITH CHECK (true);

-- Ensure only one default instance
CREATE UNIQUE INDEX idx_single_default_instance 
ON public.whatsapp_instances (is_default) 
WHERE is_default = true;

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at
BEFORE UPDATE ON public.whatsapp_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add instance_id to monitored_groups
ALTER TABLE public.monitored_groups 
ADD COLUMN instance_id UUID REFERENCES public.whatsapp_instances(id);