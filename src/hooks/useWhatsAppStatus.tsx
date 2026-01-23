import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type ConnectionStatus = "connected" | "disconnected" | "loading";

/**
 * Lightweight hook for checking WhatsApp connection status.
 * Used in sidebar and other components that just need status info.
 */
export function useWhatsAppStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("loading");

  const checkStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'status' },
      });

      if (error) {
        console.error('Error checking WhatsApp status:', error);
        setStatus('disconnected');
        return;
      }
      
      setStatus(data.status === 'connected' ? 'connected' : 'disconnected');
    } catch (err) {
      console.error('Error checking WhatsApp status:', err);
      setStatus('disconnected');
    }
  }, []);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Refresh status every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return { status, checkStatus };
}
