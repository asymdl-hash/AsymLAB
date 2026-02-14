'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, CheckCircle, Mail } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetMode, setResetMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlError = searchParams.get('error');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await auth.signIn(email, password);

            if (error) throw error;
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!email) {
                throw new Error('Por favor insira o seu email');
            }

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/set-password`,
            });

            if (error) throw error;
            setResetSent(true);
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar email de recuperação');
        } finally {
            setLoading(false);
        }
    };

    // Reset password sent confirmation
    if (resetSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                        <div className="rounded-full bg-green-100 p-3">
                            <Mail className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-center">
                            Email enviado!
                        </h2>
                        <p className="text-sm text-muted-foreground text-center max-w-xs">
                            Verifique a sua caixa de email em <strong>{email}</strong> para redefinir a sua password.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => { setResetMode(false); setResetSent(false); setError(''); }}
                            className="gap-2 mt-4"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar ao Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Reset password form
    if (resetMode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold">Recuperar Password</CardTitle>
                        <CardDescription>
                            Insira o seu email para receber um link de recuperação.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="reset_email"
                                    className="text-sm font-medium leading-none"
                                >
                                    Email
                                </label>
                                <input
                                    id="reset_email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                />
                            </div>
                            {error && (
                                <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading || !email}
                            >
                                {loading ? 'A enviar...' : 'Enviar Link de Recuperação'}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setResetMode(false); setError(''); }}
                                className="w-full gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Voltar ao Login
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">AsymLAB</CardTitle>
                    <CardDescription>
                        Sistema de Gestão Clínica
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="email"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setResetMode(true); setError(''); }}
                                    className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                                >
                                    Esqueci-me da password
                                </button>
                            </div>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>
                        {(error || urlError) && (
                            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                {error || urlError}
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? 'A entrar...' : 'Entrar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
