'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { auth, supabase } from '@/lib/supabase';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { AppModule } from '@/lib/permissions';
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
    UserCircle,
    PanelLeft,
    Stethoscope,
    ListTodo,
    Lock,
    Sun,
    Moon,
    GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    href: string;
    module: AppModule;
}

const menuItems: MenuItem[] = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', module: 'dashboard' },
    { icon: Building2, label: 'Clínicas', href: '/dashboard/clinics', module: 'clinics' },
    { icon: Stethoscope, label: 'Médicos', href: '/dashboard/doctors', module: 'doctors' },
    { icon: Users, label: 'Pacientes', href: '/dashboard/patients', module: 'patients' },
    { icon: ListTodo, label: 'Fila de Pedidos', href: '/dashboard/queue', module: 'queue' },
    { icon: Calendar, label: 'Agenda', href: '/dashboard/schedule', module: 'schedule' },
    { icon: Euro, label: 'Faturação', href: '/dashboard/billing', module: 'billing' },
    { icon: BarChart3, label: 'Relatórios', href: '/dashboard/reports', module: 'reports' },
    { icon: Settings, label: 'Definições', href: '/dashboard/settings', module: 'settings' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { collapsed, toggleCollapsed } = useSidebar();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user, hasAccess, isReadOnly, role } = useAuth();
    const { theme, toggleTheme } = useTheme();

    // === Badge: contagem de pedidos activos ===
    const [queueCount, setQueueCount] = useState(0);
    const [urgentCount, setUrgentCount] = useState(0);

    const fetchQueueCounts = useCallback(async () => {
        try {
            const { count } = await supabase
                .from('treatment_plans')
                .select('*', { count: 'exact', head: true })
                .in('estado', ['activo', 'reaberto']);
            setQueueCount(count || 0);

            const { count: urg } = await supabase
                .from('treatment_plans')
                .select('*', { count: 'exact', head: true })
                .in('estado', ['activo', 'reaberto'])
                .eq('urgente', true);
            setUrgentCount(urg || 0);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchQueueCounts();
        const interval = setInterval(fetchQueueCounts, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, [fetchQueueCounts]);

    // Filtrar menus por permissão
    const baseVisibleMenuItems = menuItems.filter(item => hasAccess(item.module));

    // === Sidebar reordenável ===
    const [menuOrder, setMenuOrder] = useState<string[] | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const dragNodeRef = useRef<HTMLElement | null>(null);

    // Load order from localStorage
    useEffect(() => {
        if (user?.id) {
            try {
                const saved = localStorage.getItem(`sidebar-order-${user.id}`);
                if (saved) setMenuOrder(JSON.parse(saved));
            } catch { /* ignore */ }
        }
    }, [user?.id]);

    // Apply custom order
    const visibleMenuItems = useMemo(() => {
        if (!menuOrder) return baseVisibleMenuItems;
        const ordered: MenuItem[] = [];
        for (const href of menuOrder) {
            const item = baseVisibleMenuItems.find(i => i.href === href);
            if (item) ordered.push(item);
        }
        // Add any new items not in saved order
        for (const item of baseVisibleMenuItems) {
            if (!ordered.find(o => o.href === item.href)) ordered.push(item);
        }
        return ordered;
    }, [baseVisibleMenuItems, menuOrder]);

    const handleMenuDragStart = (e: React.DragEvent, idx: number) => {
        setDragIndex(idx);
        dragNodeRef.current = e.currentTarget as HTMLElement;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(idx));
        setTimeout(() => {
            if (dragNodeRef.current) dragNodeRef.current.style.opacity = '0.3';
        }, 0);
    };

    const handleMenuDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === idx) return;
        setDragOverIndex(idx);
    };

    const handleMenuDragEnd = () => {
        if (dragNodeRef.current) dragNodeRef.current.style.opacity = '1';
        if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
            const newItems = [...visibleMenuItems];
            const [moved] = newItems.splice(dragIndex, 1);
            newItems.splice(dragOverIndex, 0, moved);
            const newOrder = newItems.map(i => i.href);
            setMenuOrder(newOrder);
            if (user?.id) {
                try {
                    localStorage.setItem(`sidebar-order-${user.id}`, JSON.stringify(newOrder));
                } catch { /* ignore */ }
            }
        }
        setDragIndex(null);
        setDragOverIndex(null);
        dragNodeRef.current = null;
    };

    // Iniciais do utilizador
    const userInitials = user?.full_name
        ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'U';

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
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                {visibleMenuItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    const readOnly = isReadOnly(item.module);
                    const isDragTarget = dragOverIndex === idx && dragIndex !== idx;

                    return (
                        <div
                            key={item.href}
                            draggable={!collapsed || isMobile}
                            onDragStart={e => handleMenuDragStart(e, idx)}
                            onDragOver={e => handleMenuDragOver(e, idx)}
                            onDragEnd={handleMenuDragEnd}
                            className={cn(
                                "relative group",
                                isDragTarget && "before:absolute before:inset-x-0 before:-top-0.5 before:h-0.5 before:bg-primary before:rounded-full"
                            )}
                        >
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-[inset_2px_0_0_0_#f59e0b]"
                                        : "text-gray-400 hover:bg-[#1f2937] hover:text-white",
                                    collapsed && !isMobile && "justify-center px-2"
                                )}
                                title={collapsed && !isMobile ? `${item.label}${readOnly ? ' (Leitura)' : ''}` : undefined}
                            >
                                <Icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive ? "text-primary" : "text-gray-500 group-hover:text-white")} />
                                {(!collapsed || isMobile) && (
                                    <>
                                        <span className="flex-1 flex items-center gap-2">
                                            {item.label}
                                            {readOnly && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 font-normal flex items-center gap-0.5">
                                                    <Lock className="h-2.5 w-2.5" />
                                                    Leitura
                                                </span>
                                            )}
                                            {/* Queue badge */}
                                            {item.module === 'queue' && queueCount > 0 && (
                                                <span className="ml-auto flex items-center gap-1">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold tabular-nums">
                                                        {queueCount}
                                                    </span>
                                                    {urgentCount > 0 && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center gap-0.5">
                                                            ⚡{urgentCount}
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                        <GripVertical className="h-3 w-3 text-gray-600 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0" />
                                    </>
                                )}

                                {/* Collapsed badge dot */}
                                {collapsed && !isMobile && item.module === 'queue' && queueCount > 0 && (
                                    <div className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                                        {queueCount}
                                    </div>
                                )}

                                {collapsed && !isMobile && isActive && (
                                    <div className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-primary" />
                                )}
                            </Link>
                        </div>
                    );
                })}
            </nav>

            {/* Footer User Profile */}
            <div className="p-4 border-t border-[#1f2937] bg-[#0f1523]">
                <div className={cn("flex items-center gap-3", collapsed && !isMobile && "justify-center")}>
                    <Link
                        href="/dashboard/minha-conta"
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-[#1f2937] hover:ring-primary/50 transition-all overflow-hidden"
                        title="A Minha Conta"
                    >
                        {user?.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="w-full h-full bg-gradient-to-tr from-primary to-yellow-300 flex items-center justify-center">
                                {userInitials}
                            </span>
                        )}
                    </Link>

                    {(!collapsed || isMobile) && (
                        <Link
                            href="/dashboard/minha-conta"
                            className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                        >
                            <p className="text-sm font-medium text-white truncate">{user?.full_name || 'Utilizador'}</p>
                            <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                <UserCircle className="h-3 w-3" />
                                A Minha Conta
                            </p>
                        </Link>
                    )}

                    {(!collapsed || isMobile) && (
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-gray-500 hover:text-amber-400 hover:bg-[#1f2937] rounded-md transition-colors"
                            title={theme === 'light' ? 'Mudar para Dark Mode' : 'Mudar para Light Mode'}
                        >
                            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        </button>
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
