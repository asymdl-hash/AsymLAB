import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const token_hash = requestUrl.searchParams.get('token_hash');
    const type = requestUrl.searchParams.get('type');

    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                },
            },
        }
    );

    // Handle code exchange (OAuth flow)
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Check if this is an invited user who needs to set password
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.app_metadata?.providers?.length === 0 ||
                user?.user_metadata?.app_role === 'clinic_user') {
                // Invited user - redirect to set password
                return NextResponse.redirect(new URL('/auth/set-password', requestUrl.origin));
            }
            return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
        }
    }

    // Handle token hash (magic link / invite link)
    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
        });

        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();

            // If it's an invite, redirect to set-password page
            if (type === 'invite' || type === 'magiclink' ||
                user?.user_metadata?.app_role === 'clinic_user') {
                return NextResponse.redirect(new URL('/auth/set-password', requestUrl.origin));
            }

            return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
        }
    }

    // If something went wrong, redirect to login with error
    return NextResponse.redirect(
        new URL('/login?error=Erro ao processar o convite. Tente novamente.', requestUrl.origin)
    );
}
