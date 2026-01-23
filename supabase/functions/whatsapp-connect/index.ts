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
    const UAZAPI_URL = Deno.env.get('EVOLUTION_API_URL');
    const UAZAPI_TOKEN = Deno.env.get('EVOLUTION_API_KEY');

    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      console.error('Missing UAZAPI credentials');
      return new Response(
        JSON.stringify({ error: 'Credenciais da UAZAPI não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'qr';

    console.log(`WhatsApp Connect - Action: ${action}`);

    if (action === 'status') {
      // Check connection status
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
        return new Response(
          JSON.stringify({ 
            status: 'disconnected', 
            error: 'Falha ao verificar status' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const statusData = await statusResponse.json();
      console.log('Status response:', JSON.stringify(statusData));

      // UAZAPI returns status in different formats, handle common cases
      const isConnected = 
        statusData.state === 'open' || 
        statusData.status === 'open' ||
        statusData.connected === true ||
        statusData.state === 'connected';

      return new Response(
        JSON.stringify({ 
          status: isConnected ? 'connected' : 'disconnected',
          details: statusData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'qr') {
      // Generate QR code for connection
      console.log('Requesting QR code from UAZAPI...');
      
      const qrResponse = await fetch(`${UAZAPI_URL}/instance/connect`, {
        method: 'GET',
        headers: {
          'token': UAZAPI_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (!qrResponse.ok) {
        const errorText = await qrResponse.text();
        console.error('QR generation failed:', errorText);
        
        // Check if already connected
        if (errorText.includes('already') || errorText.includes('connected')) {
          return new Response(
            JSON.stringify({ 
              status: 'connected',
              message: 'WhatsApp já está conectado'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: 'Falha ao gerar QR code', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const qrData = await qrResponse.json();
      console.log('QR response received, has base64:', !!qrData.base64);

      return new Response(
        JSON.stringify({
          status: 'waiting',
          qrCode: qrData.base64 || qrData.qr || qrData.code,
          pairingCode: qrData.pairingCode || null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
