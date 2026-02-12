'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/supabase';
import {
    Home,
    Users,
    Calendar,
    Euro,
    BarChart3,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    href: string;
}

const menuItems: MenuItem[] = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Pacientes', href: '/dashboard/patients' },
    { icon: Calendar, label: 'Agenda', href: '/dashboard/schedule' },
    { icon: Euro, label: 'Faturação', href: '/dashboard/billing' },
    { icon: BarChart3, label: 'Relatórios', href: '/dashboard/reports' },
    { icon: Settings, label: 'Definições', href: '/dashboard/settings' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const handleSignOut = async () => {
        await auth.signOut();
        window.location.href = '/login';
    };

    return (
        <aside
            className={cn(
                "fixed top-0 left-0 h-screen bg-[#111827] text-gray-400 border-r border-[#1f2937] transition-all duration-300 z-50 flex flex-col",
                collapsed ? "w-[70px]" : "w-64"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#1f2937]">
                {!collapsed && (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">AsymLAB</h1>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Clinic OS</p>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary font-bold mx-auto">
                        AL
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setCollapsed(false)} // Auto-expand on mobile
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                                isActive
                                    ? "bg-primary/10 text-primary shadow-[inset_2px_0_0_0_#f59e0b]" // Gold accent left
                                    : "text-gray-400 hover:bg-[#1f2937] hover:text-white",
                                collapsed && "justify-center px-2"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive ? "text-primary" : "text-gray-500 group-hover:text-white")} />
                            {!collapsed && <span>{item.label}</span>}

                            {/* Active Dot for collapsed state */}
                            {collapsed && isActive && (
                                <div className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer User Profile (Mobbin Style) */}
            <div className="p-4 border-t border-[#1f2937] bg-[#0f1523]">
                <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-yellow-300 flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-[#1f2937]">
                        DU
                    </div>

                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">Dr. Utilizador</p>
                            <p className="text-xs text-gray-500 truncate">Administrador</p>
                        </div>
                    )}

                    {!collapsed && (
                        <button
                            onClick={handleSignOut}
                            className="p-2 text-gray-500 hover:text-white hover:bg-[#1f2937] rounded-md transition-colors"
                            title="Sair"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Collapse Toggle (Absolute) */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-20 w-6 h-6 bg-[#1f2937] border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary transition-colors shadow-sm z-50"
            >
                {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>
        </aside>
    );
}
