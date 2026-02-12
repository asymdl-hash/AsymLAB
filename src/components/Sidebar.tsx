'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/supabase';
import styles from './Sidebar.module.css';

interface MenuItem {
    icon: string;
    label: string;
    href: string;
}

const menuItems: MenuItem[] = [
    { icon: '⌂', label: 'Dashboard', href: '/dashboard' },
    { icon: '👤', label: 'Pacientes', href: '/dashboard/patients' },
    { icon: '📅', label: 'Agenda', href: '/dashboard/schedule' },
    { icon: '€', label: 'Faturação', href: '/dashboard/billing' },
    { icon: '📊', label: 'Relatórios', href: '/dashboard/reports' },
    { icon: '⚙', label: 'Definições', href: '/dashboard/settings' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const handleSignOut = async () => {
        await auth.signOut();
        window.location.href = '/login';
    };

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
    };

    return (
        <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
            <div className={styles.sidebarHeader}>
                {!collapsed && (
                    <>
                        <h1 className={styles.logo}>AsymLAB</h1>
                        <p className={styles.tagline}>Sistema de Gestão</p>
                    </>
                )}
                {collapsed && <div className={styles.logoCollapsed}>AL</div>}
                <button onClick={toggleSidebar} className={styles.toggleBtn} title={collapsed ? 'Expandir' : 'Minimizar'}>
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            <nav className={styles.nav}>
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            title={collapsed ? item.label : ''}
                        >
                            <span className={styles.icon}>{item.icon}</span>
                            {!collapsed && <span className={styles.label}>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.sidebarFooter}>
                {!collapsed && (
                    <div className={styles.userInfo}>
                        <div className={styles.avatar}>DU</div>
                        <div className={styles.userDetails}>
                            <p className={styles.userName}>Dr. Utilizador</p>
                            <p className={styles.userRole}>Administrador</p>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div className={styles.avatarCollapsed}>DU</div>
                )}
                <button onClick={handleSignOut} className={styles.signOutBtn} title={collapsed ? 'Sair' : ''}>
                    <span className={styles.icon}>⎋</span>
                    {!collapsed && <span className={styles.label}>Sair</span>}
                </button>
            </div>
        </aside>
    );
}
