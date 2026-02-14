'use client';

import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[#f9fafb] antialiased">
            <Sidebar />
            {/* Main Content Area */}
            {/* Mobile: sem margem lateral, com padding-top para o header bar */}
            {/* Desktop: margem esquerda para a sidebar fixa */}
            <main className="flex-1 pt-14 md:pt-0 md:ml-64 transition-all duration-300 bg-[#f9fafb] min-h-screen relative">
                {children}
            </main>
        </div>
    );
}
