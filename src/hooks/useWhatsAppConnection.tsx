import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ConnectionStatus = "connected" | "disconnected" | "waiting" | "loading";

export function useWhatsAppConnection() {
  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const checkStatus = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('whatsapp-connect', {
        body: {},
        headers: { 'Content-Type': 'application/json' },
      });

      // Build URL with query param since invoke doesn't support query params directly
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-connect?action=status`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao verificar status');
      }

      const statusData = await response.json();
      
      if (statusData.status === 'connected') {
        setStatus('connected');
        setQrCode(null);
      } else {
        setStatus('disconnected');
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-connect?action=qr`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao gerar QR code');
      }

      const data = await response.json();
      
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
    fetchQrCode,
    checkStatus,
  };
}
