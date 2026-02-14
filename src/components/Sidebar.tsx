'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/supabase';
import { useSidebar } from '@/contexts/SidebarContext';
import {
    Home,
    Users,
    Calendar,
    Euro,
    BarChart3,
    Settings,
    LogOut,
    Activity,
    Building2,
    Menu,
    X,

    PanelLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    href: string;
    iconBg: string;
    iconColor: string;
}

const menuItems: MenuItem[] = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', iconBg: 'bg-blue-500/15', iconColor: 'text-blue-400' },
    { icon: Building2, label: 'Clínicas', href: '/dashboard/clinics', iconBg: 'bg-violet-500/15', iconColor: 'text-violet-400' },
    { icon: Users, label: 'Pacientes', href: '/dashboard/patients', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
    { icon: Calendar, label: 'Agenda', href: '/dashboard/schedule', iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400' },
    { icon: Euro, label: 'Faturação', href: '/dashboard/billing', iconBg: 'bg-teal-500/15', iconColor: 'text-teal-400' },
    { icon: BarChart3, label: 'Relatórios', href: '/dashboard/reports', iconBg: 'bg-indigo-500/15', iconColor: 'text-indigo-400' },
    { icon: Settings, label: 'Definições', href: '/dashboard/settings', iconBg: 'bg-gray-500/15', iconColor: 'text-gray-400' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { collapsed, toggleCollapsed } = useSidebar();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Fechar sidebar mobile quando muda de página
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Fechar sidebar mobile com Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Bloquear scroll do body quando mobile sidebar está aberta
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const handleSignOut = async () => {
        await auth.signOut();
        window.location.href = '/login';
    };

    const sidebarContent = (isMobile: boolean = false) => (
        <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#1f2937]">
                {isMobile ? (
                    /* MOBILE: Logo + Nome + Fechar */
                    <>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                <Activity className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white tracking-tight">AsymLAB</h1>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Clinic OS</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="p-2 text-gray-400 hover:text-white rounded-md transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </>
                ) : collapsed ? (
                    /* DESKTOP FECHADA: Só o botão de expandir, centrado */
                    <button
                        onClick={toggleCollapsed}
                        className="w-10 h-10 rounded-lg bg-[#1f2937] flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary/20 transition-colors mx-auto"
                        title="Expandir sidebar"
                    >
                        <PanelLeft className="h-5 w-5" />
                    </button>
                ) : (
                    /* DESKTOP ABERTA: Logo + Nome + Botão fechar à direita */
                    <>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                <Activity className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white tracking-tight">AsymLAB</h1>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Clinic OS</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleCollapsed}
                            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-[#1f2937] transition-colors"
                            title="Recolher sidebar"
                        >
                            <PanelLeft className="h-5 w-5" />
                        </button>
                    </>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                                isActive
                                    ? "bg-white/5 text-white"
                                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
                                collapsed && !isMobile && "justify-center px-2"
                            )}
                            title={collapsed && !isMobile ? item.label : undefined}
                        >
                            {/* Flat Icon com cor própria */}
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                                isActive ? item.iconBg : `${item.iconBg} opacity-70 group-hover:opacity-100`
                            )}>
                                <Icon className={cn("h-[18px] w-[18px] transition-colors", item.iconColor)} />
                            </div>
                            {(!collapsed || isMobile) && (
                                <span className={cn(
                                    "transition-colors",
                                    isActive ? "text-white font-semibold" : ""
                                )}>{item.label}</span>
                            )}

                            {/* Indicador ativo */}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer User Profile */}
            <div className="p-4 border-t border-[#1f2937] bg-[#0f1523]">
                <div className={cn("flex items-center gap-3", collapsed && !isMobile && "justify-center")}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-yellow-300 flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-[#1f2937]">
                        DU
                    </div>

                    {(!collapsed || isMobile) && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">Dr. Utilizador</p>
                            <p className="text-xs text-gray-500 truncate">Administrador</p>
                        </div>
                    )}

                    {(!collapsed || isMobile) && (
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
        </>
    );

    return (
        <>
            {/* ============ MOBILE: Header bar com botão hamburger ============ */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#111827] border-b border-[#1f2937] flex items-center px-4 z-40">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 text-gray-400 hover:text-white rounded-md transition-colors"
                    aria-label="Abrir menu"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-2 ml-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <span className="text-white font-bold text-sm">AsymLAB</span>
                </div>
            </div>

            {/* ============ MOBILE: Overlay escuro ============ */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ============ MOBILE: Sidebar drawer ============ */}
            <aside
                className={cn(
                    "md:hidden fixed top-0 left-0 h-screen w-72 bg-[#111827] text-gray-400 border-r border-[#1f2937] z-50 flex flex-col transition-transform duration-300 ease-in-out",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {sidebarContent(true)}
            </aside>

            {/* ============ DESKTOP: Sidebar fixa ============ */}
            <aside
                className={cn(
                    "hidden md:flex fixed top-0 left-0 h-screen bg-[#111827] text-gray-400 border-r border-[#1f2937] transition-all duration-300 z-50 flex-col",
                    collapsed ? "w-[70px]" : "w-64"
                )}
            >
                {sidebarContent(false)}
            </aside>
        </>
    );
}
