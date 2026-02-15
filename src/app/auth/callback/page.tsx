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
    const [status, setStatus] = useState('A processar o seu convite...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // O Supabase Auth redireciona com tokens no hash fragment
                // O @supabase/ssr client-side detecta automaticamente o hash
                // e processa a sessão via onAuthStateChange

                // Verificar se há um code na URL (PKCE flow)
                const url = new URL(window.location.href);
                const code = url.searchParams.get('code');

                if (code) {
                    setStatus('A trocar código de autenticação...');
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                }

                // Verificar se há tokens no hash (Implicit flow - usado em convites)
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
                }

                // Aguardar um momento para a sessão ser processada
                setStatus('A verificar sessão...');
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Verificar se temos sessão
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    // Sem sessão - talvez o token já expirou
                    throw new Error('Não foi possível criar a sessão. O link pode ter expirado.');
                }

                // Verificar se é um convite ou recovery — redirecionar para set-password
                if (type === 'invite' || type === 'recovery') {
                    setStatus('Bem-vindo! A preparar a sua conta...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    router.replace('/auth/set-password');
                    return;
                }

                // Para outros fluxos, ir para dashboard
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
