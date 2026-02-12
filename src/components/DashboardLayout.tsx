'use client';

import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[#f9fafb] antialiased">
            <Sidebar />
            {/* Main Content Area - Shifted right by sidebar width */}
            <main className="flex-1 ml-64 transition-all duration-300 bg-[#f9fafb] min-h-screen relative">
                {children}
            </main>
        </div>
    );
}
