import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const body = await req.json().catch(() => ({}));
    const { action = 'status', instanceId } = body;
    
    console.log(`WhatsApp Connect - Action: ${action}, InstanceId: ${instanceId || 'none'}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let UAZAPI_URL: string;
    let UAZAPI_TOKEN: string;
    let instanceDbId: string | null = null;

    // If instanceId is provided, fetch credentials from database
    if (instanceId) {
      console.log(`Fetching instance ${instanceId} from database...`);
      const { data: instance, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('id', instanceId)
        .maybeSingle();

      if (instanceError) {
        console.error('Error fetching instance:', instanceError);
        throw new Error('Erro ao buscar instância');
      }

      if (!instance) {
        throw new Error('Instância não encontrada');
      }

      UAZAPI_URL = instance.api_url;
      UAZAPI_TOKEN = instance.api_token;
      instanceDbId = instance.id;
      console.log(`Using instance: ${instance.name} (${UAZAPI_URL})`);
    } else {
      // Fallback to environment variables for backward compatibility
      UAZAPI_URL = Deno.env.get('EVOLUTION_API_URL') || '';
      UAZAPI_TOKEN = Deno.env.get('EVOLUTION_API_KEY') || '';
      console.log('Using environment variables for UAZAPI credentials');
    }

    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      throw new Error('Credenciais da UAZAPI não configuradas');
    }

    // Ensure URL has protocol and no trailing slash
    if (!UAZAPI_URL.startsWith('http://') && !UAZAPI_URL.startsWith('https://')) {
      UAZAPI_URL = `https://${UAZAPI_URL}`;
    }
    UAZAPI_URL = UAZAPI_URL.replace(/\/$/, '');

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

    // ========== ACTION: DISCONNECT ==========
    if (action === 'disconnect' || action === 'logout') {
      console.log('Requesting logout from UAZAPI...');
      
      const logoutEndpoints = [
        { method: 'DELETE', url: `${UAZAPI_URL}/instance/logout` },
        { method: 'PUT', url: `${UAZAPI_URL}/instance/logout` },
        { method: 'POST', url: `${UAZAPI_URL}/instance/logout` },
        { method: 'DELETE', url: `${UAZAPI_URL}/instance/disconnect` },
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
          
          if (resp.ok || resp.status === 200) {
            console.log('Logout successful');
            break;
          }
        } catch (e) {
          console.log(`Error with ${endpoint.method} ${endpoint.url}:`, e);
        }
      }

      // Update instance status in database
      if (instanceDbId) {
        await supabase
          .from('whatsapp_instances')
          .update({
            status: 'disconnected',
            profile_name: null,
            profile_picture_url: null,
            phone_number: null,
          })
          .eq('id', instanceDbId);
      }

      return new Response(
        JSON.stringify({ 
          status: 'disconnected',
          message: 'WhatsApp desconectado com sucesso'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== ACTION: STATUS ==========
    if (action === 'status') {
      const statusData = await getInstanceStatus();
      
      if (!statusData) {
        if (instanceDbId) {
          await supabase
            .from('whatsapp_instances')
            .update({ status: 'disconnected' })
            .eq('id', instanceDbId);
        }
        return new Response(
          JSON.stringify({ 
            status: 'disconnected', 
            error: 'Falha ao verificar status' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Status response:', JSON.stringify(statusData));

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

      let phoneNumber =
        statusData.instance?.owner ||
        statusData.instance?.phone ||
        statusData.owner ||
        statusData.phone ||
        null;

      // Format phone number
      if (phoneNumber && !phoneNumber.includes('+')) {
        phoneNumber = '+' + phoneNumber.replace('@s.whatsapp.net', '').replace('@c.us', '');
      }

      // Update instance in database
      if (instanceDbId) {
        await supabase
          .from('whatsapp_instances')
          .update({
            status: isConnected ? 'connected' : 'disconnected',
            profile_name: isConnected ? profileName : null,
            profile_picture_url: isConnected ? profilePicUrl : null,
            phone_number: isConnected ? phoneNumber : null,
          })
          .eq('id', instanceDbId);
      }

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

    // ========== ACTION: QR ==========
    if (action === 'qr') {
      console.log('Requesting QR code from UAZAPI...');
      
      // Update status to waiting
      if (instanceDbId) {
        await supabase
          .from('whatsapp_instances')
          .update({ status: 'waiting' })
          .eq('id', instanceDbId);
      }

      // First check current status - if qrcode is available there, use it
      const statusData = await getInstanceStatus();
      
      if (statusData) {
        // Check if already connected
        const isConnected = 
          statusData.status?.connected === true ||
          statusData.status?.loggedIn === true;
        
        if (isConnected) {
          // Update as connected
          if (instanceDbId) {
            const profileName = statusData.instance?.profileName || statusData.profileName || null;
            const profilePicUrl = statusData.instance?.profilePicUrl || statusData.profilePicUrl || null;
            let phoneNumber = statusData.instance?.owner || statusData.owner || null;
            if (phoneNumber && !phoneNumber.includes('+')) {
              phoneNumber = '+' + phoneNumber.replace('@s.whatsapp.net', '').replace('@c.us', '');
            }

            await supabase
              .from('whatsapp_instances')
              .update({
                status: 'connected',
                profile_name: profileName,
                profile_picture_url: profilePicUrl,
                phone_number: phoneNumber,
              })
              .eq('id', instanceDbId);
          }

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
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const headers = {
        'token': UAZAPI_TOKEN,
        'Content-Type': 'application/json',
      };

      const tryGetQrFromJson = (payload: any) => {
        return payload?.base64 ||
          payload?.qr ||
          payload?.qrcode ||
          payload?.code ||
          payload?.instance?.qrcode ||
          payload?.instance?.qrCode ||
          null;
      };

      // Try various QR endpoints
      const attempts = [
        { label: 'qrcode_get', method: 'GET', url: `${UAZAPI_URL}/instance/qrcode` },
        { label: 'qr_get', method: 'GET', url: `${UAZAPI_URL}/instance/qr` },
        { label: 'connect_get', method: 'GET', url: `${UAZAPI_URL}/instance/connect` },
      ];

      for (const attempt of attempts) {
        console.log(`Trying QR endpoint [${attempt.label}]: ${attempt.method} ${attempt.url}`);

        try {
          const resp = await fetch(attempt.url, {
            method: attempt.method,
            headers,
          });

          if (!resp.ok) {
            console.log(`Attempt [${attempt.label}] -> ${resp.status}`);
            continue;
          }

          const text = await resp.text();
          const parsed = (() => {
            try {
              return JSON.parse(text);
            } catch {
              return null;
            }
          })();

          const qrCode = tryGetQrFromJson(parsed);
          if (qrCode) {
            console.log(`QR code obtained via [${attempt.label}]`);
            return new Response(
              JSON.stringify({
                status: 'waiting',
                qrCode,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (endpointError) {
          console.log(`Attempt [${attempt.label}] failed:`, endpointError);
        }
      }

      // Try restart to generate new QR
      console.log('No QR code available, trying to restart instance...');

      try {
        const restartResp = await fetch(`${UAZAPI_URL}/instance/restart`, {
          method: 'PUT',
          headers,
        });
        
        if (restartResp.ok) {
          return new Response(
            JSON.stringify({
              status: 'restarting',
              message: 'Instância reiniciando. Aguarde alguns segundos e tente novamente.',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.log('Restart failed:', e);
      }

      return new Response(
        JSON.stringify({ 
          error: 'QR code não disponível',
          message: 'Não foi possível gerar o QR code. Tente novamente em alguns segundos.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida. Use action=qr, action=status ou action=disconnect' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('WhatsApp Connect error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
