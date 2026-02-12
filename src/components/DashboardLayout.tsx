'use client';

import Sidebar from '@/components/Sidebar';
import styles from './DashboardLayout.module.css';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className={styles.layout}>
            <Sidebar />
            <main className={styles.main}>{children}</main>
        </div>
    );
}
