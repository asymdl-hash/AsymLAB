'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, Mail, HelpCircle, X } from 'lucide-react';

function LoginForm() {
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetMode, setResetMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const helpRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Fechar tooltip ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
                setShowHelp(false);
            }
        }
        if (showHelp) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showHelp]);
    const searchParams = useSearchParams();
    const urlError = searchParams.get('error');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await auth.signIn(emailOrUsername, password);

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
            if (!emailOrUsername || !emailOrUsername.includes('@')) {
                throw new Error('A recuperação de password requer um email (com @)');
            }

            const { error } = await supabase.auth.resetPasswordForEmail(emailOrUsername, {
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
            <Card className="w-full max-w-md">
                <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="rounded-full bg-green-100 p-3">
                        <Mail className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-center">
                        Email enviado!
                    </h2>
                    <p className="text-sm text-muted-foreground text-center max-w-xs">
                        Verifique a sua caixa de email em <strong>{emailOrUsername}</strong> para redefinir a sua password.
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
        );
    }

    // Reset password form
    if (resetMode) {
        return (
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
                                value={emailOrUsername}
                                onChange={(e) => setEmailOrUsername(e.target.value)}
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
                            disabled={loading || !emailOrUsername}
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
        );
    }

    // Login form
    return (
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
                        <div className="flex items-center gap-1.5 relative" ref={helpRef}>
                            <label
                                htmlFor="login_identifier"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Email ou Username
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowHelp(!showHelp)}
                                className="text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                                aria-label="Ajuda sobre login"
                            >
                                <HelpCircle className="h-4 w-4" />
                            </button>
                            {showHelp && (
                                <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-start justify-between mb-2">
                                        <p className="text-sm font-semibold text-gray-900">Como fazer login?</p>
                                        <button
                                            type="button"
                                            onClick={() => setShowHelp(false)}
                                            className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <div className="space-y-2.5 text-xs text-gray-600">
                                        <div className="flex items-start gap-2">
                                            <span className="text-base leading-none mt-0.5">📧</span>
                                            <p><strong>Email:</strong> Use o seu email pessoal (ex: joao@email.com).</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-base leading-none mt-0.5">👤</span>
                                            <p><strong>Username:</strong> Use o username atribuído pelo administrador (ex: ana.assistente).</p>
                                        </div>
                                        <hr className="border-gray-100" />
                                        <div className="flex items-start gap-2">
                                            <span className="text-base leading-none mt-0.5">🔑</span>
                                            <p>A recuperação de password só está disponível para contas com <strong>email</strong>. Para contas com username, contacte o administrador.</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45 absolute -top-1 left-6"></div>
                                </div>
                            )}
                        </div>
                        <input
                            id="login_identifier"
                            type="text"
                            placeholder="email@exemplo.com ou username"
                            value={emailOrUsername}
                            onChange={(e) => setEmailOrUsername(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                            autoComplete="username"
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
                            {emailOrUsername.includes('@') && (
                                <button
                                    type="button"
                                    onClick={() => { setResetMode(true); setError(''); }}
                                    className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                                >
                                    Esqueci-me da password
                                </button>
                            )}
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
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Suspense fallback={
                <Card className="w-full max-w-md">
                    <CardContent className="flex items-center justify-center py-10">
                        <p className="text-sm text-muted-foreground">A carregar...</p>
                    </CardContent>
                </Card>
            }>
                <LoginForm />
            </Suspense>
        </div>
    );
}
