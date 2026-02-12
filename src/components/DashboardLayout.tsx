'use client';

import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <main className="flex-1 ml-64 transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
