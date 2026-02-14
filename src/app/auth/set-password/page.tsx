'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function SetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const router = useRouter();

    useEffect(() => {
        // Get current user info
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
            } else {
                // No session - redirect to login
                router.push('/login');
            }
        };
        getUser();
    }, [router]);

    const validatePassword = () => {
        if (password.length < 6) {
            setError('A password deve ter pelo menos 6 caracteres');
            return false;
        }
        if (password !== confirmPassword) {
            setError('As passwords não coincidem');
            return false;
        }
        return true;
    };

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validatePassword()) return;

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            setSuccess(true);

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);

        } catch (err: any) {
            setError(err.message || 'Erro ao definir password');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                        <div className="rounded-full bg-green-100 p-3">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-green-800">
                            Password definida com sucesso!
                        </h2>
                        <p className="text-sm text-muted-foreground text-center">
                            A redirecionar para o Dashboard...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        <CardTitle className="text-2xl font-bold">Definir Password</CardTitle>
                    </div>
                    <CardDescription>
                        {userEmail ? (
                            <>
                                Bem-vindo ao <strong>AsymLAB</strong>!
                                <br />
                                Defina a sua password para aceder ao sistema.
                                <br />
                                <span className="text-xs text-muted-foreground mt-1 block">
                                    Conta: {userEmail}
                                </span>
                            </>
                        ) : (
                            'A carregar...'
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="password"
                                className="text-sm font-medium leading-none"
                            >
                                Nova Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Mínimo 6 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-10"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="confirmPassword"
                                className="text-sm font-medium leading-none"
                            >
                                Confirmar Password
                            </label>
                            <input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Repita a password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                required
                                minLength={6}
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
                            disabled={loading || !password || !confirmPassword}
                        >
                            {loading ? 'A guardar...' : 'Definir Password e Entrar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
