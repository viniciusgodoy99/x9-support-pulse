import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ConnectionStatus = "connected" | "disconnected" | "waiting" | "loading";

export interface WhatsAppProfile {
  name: string | null;
  pictureUrl: string | null;
  phoneNumber: string | null;
}

export function useWhatsAppConnection() {
  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<WhatsAppProfile | null>(null);
  const { toast } = useToast();

  const checkStatus = useCallback(async () => {
    try {
      const { data: statusData, error: fnError } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'status' },
      });

      if (fnError) throw fnError;
      
      if (statusData.status === 'connected') {
        setStatus('connected');
        setQrCode(null);
        setProfile({
          name: statusData.profileName || null,
          pictureUrl: statusData.profilePicUrl || null,
          phoneNumber: statusData.phoneNumber || null,
        });
      } else {
        setStatus('disconnected');
        setProfile(null);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error checking status:', err);
      setError('Erro ao verificar status da conexão');
    }
  }, []);

  const fetchQrCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'qr' },
      });

      if (fnError) throw fnError;
      
      if (data.status === 'connected') {
        setStatus('connected');
        setQrCode(null);
        toast({
          title: "WhatsApp Conectado",
          description: "Sua instância já está conectada!",
        });
      } else if (data.qrCode) {
        setQrCode(data.qrCode);
        setStatus('waiting');
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error fetching QR code:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar QR code');
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : 'Erro ao gerar QR code',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const disconnect = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'logout' },
      });

      if (fnError) throw fnError;
      
      setStatus('disconnected');
      setQrCode(null);
      setProfile(null);
      
      toast({
        title: "WhatsApp Desconectado",
        description: "A instância foi desconectada com sucesso.",
      });
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError(err instanceof Error ? err.message : 'Erro ao desconectar');
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : 'Erro ao desconectar',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Polling when waiting for scan
  useEffect(() => {
    if (status !== 'waiting') return;

    const interval = setInterval(() => {
      checkStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [status, checkStatus]);

  return {
    status,
    qrCode,
    loading,
    error,
    profile,
    fetchQrCode,
    checkStatus,
    disconnect,
  };
}
