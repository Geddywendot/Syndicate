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

    const { name, created_by } = await req.json()

    if (!name || !created_by) {
      throw new Error('Name and created_by are required')
    }

    // 1. Create group (Bypasses RLS using Service Role)
    const { data: group, error: groupError } = await supabaseClient
      .from('groups')
      .insert([{ name, created_by }])
      .select()
      .single()

    if (groupError) throw groupError

    // 2. Add creator as member
    const { error: memberError } = await supabaseClient
      .from('group_members')
      .insert([{ group_id: group.id, user_id: created_by }])

    if (memberError) throw memberError

    return new Response(JSON.stringify(group), {
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
