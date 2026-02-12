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
    ChevronRight
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
                "fixed top-0 left-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-50",
                collapsed ? "w-[70px]" : "w-64"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                {!collapsed && (
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">AsymLAB</h1>
                        <p className="text-xs text-gray-500 mt-1">Sistema de Gestão</p>
                    </div>
                )}
                {collapsed && (
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold mx-auto">
                        AL
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        "p-1.5 rounded-md hover:bg-gray-100 transition-colors",
                        collapsed && "mx-auto mt-2"
                    )}
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4 text-gray-600" />
                    ) : (
                        <ChevronLeft className="h-4 w-4 text-gray-600" />
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100",
                                collapsed && "justify-center"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
                {!collapsed && (
                    <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-md bg-white">
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                            DU
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">Dr. Utilizador</p>
                            <p className="text-xs text-gray-500 truncate">Administrador</p>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold mx-auto mb-2">
                        DU
                    </div>
                )}
                <button
                    onClick={handleSignOut}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors w-full",
                        collapsed && "justify-center"
                    )}
                    title={collapsed ? 'Sair' : undefined}
                >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>Sair</span>}
                </button>
            </div>
        </aside>
    );
}
