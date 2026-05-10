import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { paramsToSign } = await req.json();
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!apiSecret) {
      throw new Error('CLOUDINARY_API_SECRET is missing');
    }

    // Sort params alphabetically by key
    const sortedKeys = Object.keys(paramsToSign).sort();
    const signString = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&') + apiSecret;

    // Create SHA-1 signature
    const encoder = new TextEncoder();
    const data = encoder.encode(signString);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return new Response(JSON.stringify({ signature }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
