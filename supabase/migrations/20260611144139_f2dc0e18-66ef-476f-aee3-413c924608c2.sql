CREATE TABLE public.x9_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.x9_permissions TO authenticated;
GRANT ALL ON public.x9_permissions TO service_role;

ALTER TABLE public.x9_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage x9_permissions" ON public.x9_permissions FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.x9_permissions (key, label, description, is_enabled) VALUES
('monitoring', 'Monitoramento', 'Ativa o monitoramento de mensagens nos grupos.', true),
('sla_alerts', 'Alertas de SLA', 'Envia alertas quando o tempo de resposta expira.', true),
('demand_tracking', 'Rastreamento de Demandas', 'Permite o acompanhamento de demandas pendentes.', true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_x9_permissions_updated_at BEFORE UPDATE ON public.x9_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();