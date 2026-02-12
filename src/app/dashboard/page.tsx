'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/supabase';
import styles from './page.module.css';

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data } = await auth.getUser();
        setUser(data.user);
        setLoading(false);
    };

    const handleSignOut = async () => {
        await auth.signOut();
        window.location.href = '/login';
    };

    if (loading) {
        return (
            <main className={styles.main}>
                <div className={styles.container}>
                    <p>A carregar...</p>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1>Dashboard</h1>
                    <button onClick={handleSignOut} className={styles.signOutBtn}>
                        Sair
                    </button>
                </header>

                <div className={styles.content}>
                    <div className={styles.welcomeCard}>
                        <h2>Bem-vindo ao AsymLAB</h2>
                        <p className={styles.userEmail}>{user?.email}</p>
                        <div className={styles.infoBox}>
                            <p>
                                ✅ Autenticação funcional
                                <br />
                                ✅ PWA configurada
                                <br />
                                ✅ Responsividade total
                                <br />
                                🔄 Sincronização com Pasta Local (em breve)
                            </p>
                        </div>
                    </div>

                    <div className={styles.placeholderCard}>
                        <h3>Módulos Futuros</h3>
                        <ul>
                            <li>Ficha do Paciente</li>
                            <li>Sincronização Offline</li>
                            <li>Gestão de Consultas</li>
                            <li>Relatórios Clínicos</li>
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}
