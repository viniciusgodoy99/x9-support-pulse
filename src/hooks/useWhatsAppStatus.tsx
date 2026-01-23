import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ConnectionStatus = 'connected' | 'disconnected' | 'loading' | 'partial';

/**
 * Lightweight hook for checking WhatsApp connection status.
 * Reads from database instead of calling edge function.
 */
export function useWhatsAppStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('loading');

  const checkStatus = useCallback(async () => {
    try {
      // Use explicit any type since table might not be in generated types yet
      const { data: instances, error } = await supabase
        .from('whatsapp_instances' as any)
        .select('status') as { data: { status: string }[] | null; error: any };

      if (error) {
        console.error('Error checking WhatsApp status:', error);
        setStatus('disconnected');
        return;
      }

      if (!instances || instances.length === 0) {
        setStatus('disconnected');
        return;
      }

      const connectedCount = instances.filter(i => i.status === 'connected').length;
      
      if (connectedCount === instances.length) {
        setStatus('connected');
      } else if (connectedCount > 0) {
        setStatus('partial');
      } else {
        setStatus('disconnected');
      }
    } catch (err) {
      console.error('Error in checkStatus:', err);
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    checkStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, [checkStatus]);

  return { status, checkStatus };
}
