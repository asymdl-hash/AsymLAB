import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteRequest {
    email: string
    clinic_id: string
    full_name: string
    can_edit?: boolean
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Verificar autenticação
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing authorization header')
        }

        // Criar cliente Supabase com Service Role (admin powers)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Criar cliente normal para verificar se o user que está a fazer o pedido é admin
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        )

        // Verificar se o user é admin
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) {
            throw new Error('Unauthorized')
        }

        // IMPORTANTE: Usar supabaseAdmin para ler o profile sem RLS
        // Evita problema de recursão com a função is_admin() nas políticas RLS
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('app_role')
            .eq('user_id', user.id)
            .single()

        if (profile?.app_role !== 'admin') {
            throw new Error('Only admins can invite clinic users')
        }

        // Parse request body
        const { email, clinic_id, full_name, can_edit = false }: InviteRequest = await req.json()

        // Validar inputs
        if (!email || !clinic_id || !full_name) {
            throw new Error('Missing required fields: email, clinic_id, full_name')
        }

        // 1. Convidar utilizador via Supabase Auth
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            email,
            {
                data: {
                    app_role: 'clinic_user',
                    full_name: full_name,
                },
                redirectTo: `${Deno.env.get('APP_URL') || 'https://asym-lab-2.vercel.app'}/auth/callback`
            }
        )

        if (inviteError) {
            throw inviteError
        }

        const newUserId = inviteData.user.id

        // 2. Criar profile do utilizador
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
                user_id: newUserId,
                app_role: 'clinic_user',
                full_name: full_name
            })

        if (profileError) {
            console.error('Profile creation error:', profileError)
            // Não fazer throw - o user já foi criado, profile pode ser criado depois
        }

        // 3. Associar à clínica
        const { error: accessError } = await supabaseAdmin
            .from('user_clinic_access')
            .insert({
                user_id: newUserId,
                clinic_id: clinic_id,
                can_edit: can_edit,
                granted_by: user.id
            })

        if (accessError) {
            throw accessError
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Convite enviado para ${email}`,
                user_id: newUserId
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
