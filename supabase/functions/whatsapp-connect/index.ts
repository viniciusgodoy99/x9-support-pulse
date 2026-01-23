import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let UAZAPI_URL = Deno.env.get('EVOLUTION_API_URL');
    const UAZAPI_TOKEN = Deno.env.get('EVOLUTION_API_KEY');

    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      console.error('Missing UAZAPI credentials');
      return new Response(
        JSON.stringify({ error: 'Credenciais da UAZAPI não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure URL has protocol
    if (!UAZAPI_URL.startsWith('http://') && !UAZAPI_URL.startsWith('https://')) {
      UAZAPI_URL = `https://${UAZAPI_URL}`;
    }
    
    // Remove trailing slash if present
    UAZAPI_URL = UAZAPI_URL.replace(/\/$/, '');
    
    console.log(`Using UAZAPI URL: ${UAZAPI_URL}`);

    const url = new URL(req.url);
    let action = url.searchParams.get('action');

    // Also allow POST with JSON body: { action: "qr" | "status" }
    if (!action && req.method !== 'GET') {
      try {
        const body = await req.json().catch(() => null);
        if (body && typeof body.action === 'string') action = body.action;
      } catch {
        // ignore
      }
    }

    action = action || 'qr';

    console.log(`WhatsApp Connect - Action: ${action}`);

    // Helper function to get instance status
    const getInstanceStatus = async () => {
      const statusResponse = await fetch(`${UAZAPI_URL}/instance/status`, {
        method: 'GET',
        headers: {
          'token': UAZAPI_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Status check failed:', errorText);
        return null;
      }

      return await statusResponse.json();
    };

    // ========== ACTION: LOGOUT ==========
    if (action === 'logout') {
      console.log('Requesting logout from UAZAPI...');
      
      const logoutEndpoints = [
        { method: 'DELETE', url: `${UAZAPI_URL}/instance/logout` },
        { method: 'PUT', url: `${UAZAPI_URL}/instance/logout` },
        { method: 'POST', url: `${UAZAPI_URL}/instance/logout` },
        { method: 'DELETE', url: `${UAZAPI_URL}/instance/disconnect` },
        { method: 'PUT', url: `${UAZAPI_URL}/instance/disconnect` },
      ];

      for (const endpoint of logoutEndpoints) {
        try {
          console.log(`Trying ${endpoint.method} ${endpoint.url}`);
          const resp = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: {
              'token': UAZAPI_TOKEN,
              'Content-Type': 'application/json',
            },
          });
          
          const text = await resp.text();
          console.log(`Response ${resp.status}: ${text}`);
          
          if (resp.ok || resp.status === 200) {
            return new Response(
              JSON.stringify({ 
                status: 'disconnected',
                message: 'WhatsApp desconectado com sucesso'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (e) {
          console.log(`Error with ${endpoint.method} ${endpoint.url}:`, e);
        }
      }

      // Even if API calls fail, return disconnected to reset UI state
      return new Response(
        JSON.stringify({ 
          status: 'disconnected',
          message: 'Estado resetado localmente'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== ACTION: STATUS ==========
    if (action === 'status') {
      const statusData = await getInstanceStatus();
      
      if (!statusData) {
        return new Response(
          JSON.stringify({ 
            status: 'disconnected', 
            error: 'Falha ao verificar status' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Status response:', JSON.stringify(statusData));

      // UAZAPI returns nested structure: { instance: {...}, status: { connected: bool } }
      const isConnected = 
        statusData.status?.connected === true ||
        statusData.status?.loggedIn === true ||
        statusData.instance?.status === 'connected' ||
        statusData.state === 'open';

      // Extract profile info
      const profileName = 
        statusData.instance?.profileName ||
        statusData.instance?.name ||
        statusData.profileName ||
        statusData.name ||
        null;
      
      const profilePicUrl = 
        statusData.instance?.profilePicUrl ||
        statusData.instance?.profilePictureUrl ||
        statusData.instance?.picture ||
        statusData.profilePicUrl ||
        statusData.picture ||
        null;

      const phoneNumber =
        statusData.instance?.owner ||
        statusData.instance?.phone ||
        statusData.owner ||
        statusData.phone ||
        null;

      return new Response(
        JSON.stringify({ 
          status: isConnected ? 'connected' : 'disconnected',
          profileName,
          profilePicUrl,
          phoneNumber,
          details: statusData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'qr') {
      console.log('Requesting QR code from UAZAPI...');
      
      // First check current status - if qrcode is available there, use it
      const statusData = await getInstanceStatus();
      
      if (statusData) {
        // Check if already connected
        const isConnected = 
          statusData.status?.connected === true ||
          statusData.status?.loggedIn === true;
        
        if (isConnected) {
          return new Response(
            JSON.stringify({ 
              status: 'connected',
              message: 'WhatsApp já está conectado'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if QR code is available in status response
        if (statusData.instance?.qrcode) {
          console.log('QR code found in status response');
          return new Response(
            JSON.stringify({
              status: 'waiting',
              qrCode: statusData.instance.qrcode,
              pairingCode: statusData.instance.paircode || null
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const instanceNameFromSecret = Deno.env.get('EVOLUTION_INSTANCE_NAME') || null;
      const instanceNameFromStatus =
        (statusData?.instance?.name as string | undefined) ||
        (statusData?.instance?.id as string | undefined) ||
        null;
      const instanceName = instanceNameFromSecret || instanceNameFromStatus;

      if (!instanceName) {
        console.warn('No instance name available (EVOLUTION_INSTANCE_NAME missing and status did not include name/id).');
      } else {
        console.log(`Using instance identifier: ${instanceName}`);
      }

      const headers = {
        'token': UAZAPI_TOKEN,
        'Content-Type': 'application/json',
      };

      const tryGetQrFromJson = (payload: any) => {
        const qrCode =
          payload?.base64 ||
          payload?.qr ||
          payload?.qrcode ||
          payload?.code ||
          payload?.instance?.qrcode ||
          payload?.instance?.qrCode ||
          null;
        const pairingCode = payload?.pairingCode || payload?.paircode || payload?.instance?.paircode || null;
        return { qrCode, pairingCode };
      };

      const attempts: Array<{ label: string; method: string; url: string; body?: any }> = [];

      // Some providers require instance identifier either in path, query, or body.
      if (instanceName) {
        const encoded = encodeURIComponent(instanceName);
        attempts.push({ label: 'connect_get_path', method: 'GET', url: `${UAZAPI_URL}/instance/connect/${encoded}` });
        attempts.push({ label: 'connect_get_query', method: 'GET', url: `${UAZAPI_URL}/instance/connect?instanceName=${encoded}` });
        attempts.push({ label: 'connect_post_body', method: 'POST', url: `${UAZAPI_URL}/instance/connect`, body: { instanceName } });
        attempts.push({ label: 'connect_post_body_alt', method: 'POST', url: `${UAZAPI_URL}/instance/connect`, body: { name: instanceName } });

        attempts.push({ label: 'qrcode_get_path', method: 'GET', url: `${UAZAPI_URL}/instance/qrcode/${encoded}` });
        attempts.push({ label: 'qrcode_get_query', method: 'GET', url: `${UAZAPI_URL}/instance/qrcode?instanceName=${encoded}` });
        attempts.push({ label: 'qrcode_post_body', method: 'POST', url: `${UAZAPI_URL}/instance/qrcode`, body: { instanceName } });

        attempts.push({ label: 'qr_get_path', method: 'GET', url: `${UAZAPI_URL}/instance/qr/${encoded}` });
        attempts.push({ label: 'qr_get_query', method: 'GET', url: `${UAZAPI_URL}/instance/qr?instanceName=${encoded}` });
        attempts.push({ label: 'qr_post_body', method: 'POST', url: `${UAZAPI_URL}/instance/qr`, body: { instanceName } });
      }

      // Fallbacks without instance in URL
      attempts.push({ label: 'qrcode_get', method: 'GET', url: `${UAZAPI_URL}/instance/qrcode` });
      attempts.push({ label: 'qr_get', method: 'GET', url: `${UAZAPI_URL}/instance/qr` });
      attempts.push({ label: 'qrcode_root_get', method: 'GET', url: `${UAZAPI_URL}/qrcode` });

      for (const attempt of attempts) {
        console.log(`Trying QR endpoint [${attempt.label}]: ${attempt.method} ${attempt.url}`);

        try {
          const resp = await fetch(attempt.url, {
            method: attempt.method,
            headers,
            body: attempt.body ? JSON.stringify(attempt.body) : undefined,
          });

          const text = await resp.text();
          // Consume body first, then parse if possible.
          const parsed = (() => {
            try {
              return JSON.parse(text);
            } catch {
              return null;
            }
          })();

          if (!resp.ok) {
            console.log(`Attempt [${attempt.label}] -> ${resp.status}.`);
            continue;
          }

          const { qrCode, pairingCode } = tryGetQrFromJson(parsed);
          if (qrCode) {
            console.log(`QR code obtained via [${attempt.label}]`);
            return new Response(
              JSON.stringify({
                status: 'waiting',
                qrCode,
                pairingCode,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (endpointError) {
          const msg = endpointError instanceof Error ? endpointError.message : String(endpointError);
          console.log(`Attempt [${attempt.label}] failed: ${msg}`);
        }
      }

      // If no endpoint worked, try restart to generate new QR (also varies by provider)
      console.log('No QR code available, trying to restart instance...');

      const restartAttempts: Array<{ label: string; method: string; url: string; body?: any }> = [];
      if (instanceName) {
        const encoded = encodeURIComponent(instanceName);
        restartAttempts.push({ label: 'restart_put_path', method: 'PUT', url: `${UAZAPI_URL}/instance/restart/${encoded}` });
        restartAttempts.push({ label: 'restart_put_query', method: 'PUT', url: `${UAZAPI_URL}/instance/restart?instanceName=${encoded}` });
        restartAttempts.push({ label: 'restart_put_body', method: 'PUT', url: `${UAZAPI_URL}/instance/restart`, body: { instanceName } });
        restartAttempts.push({ label: 'restart_put_body_alt', method: 'PUT', url: `${UAZAPI_URL}/instance/restart`, body: { name: instanceName } });
      }
      restartAttempts.push({ label: 'restart_put', method: 'PUT', url: `${UAZAPI_URL}/instance/restart` });

      for (const attempt of restartAttempts) {
        console.log(`Trying restart [${attempt.label}]: ${attempt.method} ${attempt.url}`);
        try {
          const resp = await fetch(attempt.url, {
            method: attempt.method,
            headers,
            body: attempt.body ? JSON.stringify(attempt.body) : undefined,
          });
          await resp.text();
          if (resp.ok) {
            console.log('Instance restart requested, please try again in a few seconds');
            return new Response(
              JSON.stringify({
                status: 'restarting',
                message: 'Instância reiniciando. Aguarde alguns segundos e tente novamente.',
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (restartError) {
          const msg = restartError instanceof Error ? restartError.message : String(restartError);
          console.log(`Restart attempt [${attempt.label}] failed: ${msg}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          error: 'QR code não disponível',
          message: 'Não foi possível gerar o QR code. A instância pode estar desconectada. Tente novamente em alguns segundos.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida. Use action=qr ou action=status' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('WhatsApp Connect error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
