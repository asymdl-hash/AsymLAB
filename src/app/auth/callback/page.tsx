'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [status, setStatus] = useState('A processar...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                let isRecovery = false;

                // 1. Check for PKCE code in query params
                const url = new URL(window.location.href);
                const code = url.searchParams.get('code');

                if (code) {
                    setStatus('A trocar código de autenticação...');

                    // Listen for PASSWORD_RECOVERY event BEFORE exchanging code
                    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
                        if (event === 'PASSWORD_RECOVERY') {
                            isRecovery = true;
                        }
                    });

                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;

                    // Small delay to let onAuthStateChange fire
                    await new Promise(resolve => setTimeout(resolve, 500));
                    subscription.unsubscribe();
                }

                // 2. Check for tokens in hash (Implicit flow - used in invites)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const type = hashParams.get('type');

                if (accessToken && refreshToken) {
                    setStatus('A configurar a sua sessão...');
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (error) throw error;

                    if (type === 'invite' || type === 'recovery') {
                        isRecovery = true;
                    }
                }

                // 3. Verify session exists
                setStatus('A verificar sessão...');
                await new Promise(resolve => setTimeout(resolve, 500));

                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    throw new Error('Não foi possível criar a sessão. O link pode ter expirado.');
                }

                // 4. Route based on flow type
                if (isRecovery) {
                    setStatus('A preparar redefinição de password...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    router.replace('/auth/set-password');
                    return;
                }

                // Check if it's an invite (user has no password set yet)
                // The hash type check above handles implicit flow invites
                // For PKCE invites, check if user was recently created
                if (type === 'invite') {
                    setStatus('Bem-vindo! A preparar a sua conta...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    router.replace('/auth/set-password');
                    return;
                }

                // Default: go to dashboard
                router.replace('/dashboard');

            } catch (err: any) {
                console.error('Auth callback error:', err);
                setError(err.message || 'Erro ao processar autenticação');
            }
        };

        handleCallback();
    }, [router]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                        <div className="rounded-full bg-red-100 p-3">
                            <AlertCircle className="h-10 w-10 text-red-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-red-800 text-center">
                            Erro na Autenticação
                        </h2>
                        <p className="text-sm text-muted-foreground text-center max-w-xs">
                            {error}
                        </p>
                        <div className="flex gap-3 mt-4">
                            <Button
                                variant="outline"
                                onClick={() => router.push('/login')}
                            >
                                Ir para o Login
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <h2 className="text-lg font-medium text-center">
                        {status}
                    </h2>
                    <p className="text-sm text-muted-foreground text-center">
                        Por favor aguarde...
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
