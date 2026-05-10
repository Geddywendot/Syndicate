import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { group_id, user_id, admin_id } = await req.json()

    if (!group_id || !user_id || !admin_id) {
      throw new Error('Missing required fields')
    }

    // Security check: Only the group creator can add members
    const { data: group } = await supabaseClient
      .from('groups')
      .select('created_by')
      .eq('id', group_id)
      .single()

    if (!group || group.created_by !== admin_id) {
      throw new Error('Unauthorized: Only the group admin can add members')
    }

    // Add member bypassing RLS
    const { error: memberError } = await supabaseClient
      .from('group_members')
      .insert([{ group_id, user_id }])

    if (memberError) {
      if (memberError.code === '23505') {
        throw new Error('User is already a member')
      }
      throw memberError
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
