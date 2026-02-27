'use client';

import Sidebar from './Sidebar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { collapsed } = useSidebar();

    return (
        <div className="flex min-h-screen bg-background antialiased">
            <Sidebar />
            <main
                className={`flex-1 pt-14 md:pt-0 transition-all duration-300 bg-background min-h-screen relative ${collapsed ? 'md:ml-[70px]' : 'md:ml-64'
                    }`}
            >
                {children}
            </main>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ThemeProvider>
                <SidebarProvider>
                    <DashboardContent>{children}</DashboardContent>
                </SidebarProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}
