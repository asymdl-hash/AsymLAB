'use client';

import Sidebar from './Sidebar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { collapsed } = useSidebar();

    return (
        <div className="flex min-h-screen bg-[#f9fafb] antialiased">
            <Sidebar />
            {/* Main Content Area */}
            {/* Mobile: sem margem lateral, com padding-top para o header bar */}
            {/* Desktop: margem esquerda adapta-se ao estado da sidebar */}
            <main
                className={`flex-1 pt-14 md:pt-0 transition-all duration-300 bg-[#f9fafb] min-h-screen relative ${collapsed ? 'md:ml-[70px]' : 'md:ml-64'
                    }`}
            >
                {children}
            </main>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <DashboardContent>{children}</DashboardContent>
        </SidebarProvider>
    );
}
