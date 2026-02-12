'use client';

import { useState, FormEvent } from 'react';
import { auth } from '@/lib/supabase';
import styles from './AuthForm.module.css';

interface AuthFormProps {
    onSuccess?: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error: signInError } = await auth.signIn(email, password);

        if (signInError) {
            setError(signInError.message);
            setLoading(false);
            return;
        }

        if (data.session) {
            onSuccess?.();
            window.location.href = '/dashboard';
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
                <label htmlFor="email">E-mail</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    required
                    disabled={loading}
                />
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" disabled={loading} className={styles.submitBtn}>
                {loading ? 'A entrar...' : 'Entrar'}
            </button>
        </form>
    );
}
