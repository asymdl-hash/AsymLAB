'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
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

    if (loading) {
        return (
            <DashboardLayout>
                <div className={styles.container}>
                    <p>A carregar...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1>Dashboard</h1>
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
                                ✅ Sidebar com navegação
                                <br />
                                🔄 Sincronização com Pasta Local (em breve)
                            </p>
                        </div>
                    </div>

                    <div className={styles.placeholderCard}>
                        <h3>Módulos Disponíveis</h3>
                        <ul>
                            <li>👤 Pacientes</li>
                            <li>📅 Agenda</li>
                            <li>💰 Faturação</li>
                            <li>📊 Relatórios</li>
                        </ul>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
