import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppInstance {
  id: string;
  name: string;
  api_url: string;
  api_token: string;
  instance_name: string | null;
  phone_number: string | null;
  profile_name: string | null;
  profile_picture_url: string | null;
  status: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInstanceData {
  name: string;
  api_url: string;
  api_token: string;
  instance_name?: string;
  is_default?: boolean;
}

export function useWhatsAppInstances() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInstances = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setInstances((data as WhatsAppInstance[]) || []);
    } catch (err) {
      console.error('Error fetching instances:', err);
      toast({
        title: 'Erro ao carregar instâncias',
        description: 'Não foi possível carregar as instâncias do WhatsApp.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createInstance = async (data: CreateInstanceData): Promise<WhatsAppInstance | null> => {
    try {
      // If setting as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from('whatsapp_instances')
          .update({ is_default: false })
          .eq('is_default', true);
      }

      const { data: newInstance, error } = await supabase
        .from('whatsapp_instances')
        .insert({
          name: data.name,
          api_url: data.api_url,
          api_token: data.api_token,
          instance_name: data.instance_name || null,
          is_default: data.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Instância criada',
        description: 'A instância foi criada com sucesso.',
      });

      await fetchInstances();
      return newInstance as WhatsAppInstance;
    } catch (err) {
      console.error('Error creating instance:', err);
      toast({
        title: 'Erro ao criar instância',
        description: 'Não foi possível criar a instância.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateInstance = async (id: string, updates: Partial<WhatsAppInstance>): Promise<boolean> => {
    try {
      // If setting as default, unset other defaults first
      if (updates.is_default) {
        await supabase
          .from('whatsapp_instances')
          .update({ is_default: false })
          .eq('is_default', true);
      }

      const { error } = await supabase
        .from('whatsapp_instances')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchInstances();
      return true;
    } catch (err) {
      console.error('Error updating instance:', err);
      toast({
        title: 'Erro ao atualizar instância',
        description: 'Não foi possível atualizar a instância.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteInstance = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Instância removida',
        description: 'A instância foi removida com sucesso.',
      });

      await fetchInstances();
      return true;
    } catch (err) {
      console.error('Error deleting instance:', err);
      toast({
        title: 'Erro ao remover instância',
        description: 'Não foi possível remover a instância.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  return {
    instances,
    loading,
    fetchInstances,
    createInstance,
    updateInstance,
    deleteInstance,
  };
}
