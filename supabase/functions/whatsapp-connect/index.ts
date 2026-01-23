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
    const action = url.searchParams.get('action') || 'qr';

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

      return new Response(
        JSON.stringify({ 
          status: isConnected ? 'connected' : 'disconnected',
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

      // Try different QR code endpoints
      const qrEndpoints = [
        '/instance/qrcode',
        '/instance/qr',
        '/qrcode',
      ];

      for (const endpoint of qrEndpoints) {
        console.log(`Trying endpoint: ${UAZAPI_URL}${endpoint}`);
        
        try {
          const qrResponse = await fetch(`${UAZAPI_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'token': UAZAPI_TOKEN,
              'Content-Type': 'application/json',
            },
          });

          if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            console.log('QR response received from', endpoint, ':', JSON.stringify(qrData));

            const qrCode = qrData.base64 || qrData.qr || qrData.qrcode || qrData.code;
            
            if (qrCode) {
              return new Response(
                JSON.stringify({
                  status: 'waiting',
                  qrCode: qrCode,
                  pairingCode: qrData.pairingCode || qrData.paircode || null
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } else {
            const errorText = await qrResponse.text();
            console.log(`Endpoint ${endpoint} returned ${qrResponse.status}:`, errorText);
          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} failed:`, endpointError);
        }
      }

      // If no endpoint worked, try restart to generate new QR
      console.log('No QR code available, trying to restart instance...');
      
      try {
        const restartResponse = await fetch(`${UAZAPI_URL}/instance/restart`, {
          method: 'PUT',
          headers: {
            'token': UAZAPI_TOKEN,
            'Content-Type': 'application/json',
          },
        });

        if (restartResponse.ok) {
          console.log('Instance restart requested, please try again in a few seconds');
          return new Response(
            JSON.stringify({ 
              status: 'restarting',
              message: 'Instância reiniciando. Aguarde alguns segundos e tente novamente.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (restartError) {
        console.log('Restart failed:', restartError);
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
