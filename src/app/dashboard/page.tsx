'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Plus, Search, Bell, Grid, List, Calendar, Euro } from 'lucide-react';
import PermissionGuard, { useModulePermission } from '@/components/PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { getUserHomepage, getUserHomepagePath } from '@/lib/userPreferences';

export default function DashboardPage() {
    const { user } = useAuth();
    const { canEdit } = useModulePermission('dashboard');
    const router = useRouter();

    useEffect(() => {
        if (user?.id) {
            const homepage = getUserHomepage(user.id);
            if (homepage !== 'dashboard') {
                const path = getUserHomepagePath(user.id);
                router.replace(path);
            }
        }
    }, [user?.id, router]);

    return (
        <PermissionGuard module="dashboard">
            {/* Header */}
            <div className="bg-card border-b border-border sticky top-0 z-40">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-card-foreground tracking-tight">Dashboard</h1>
                            <p className="text-muted-foreground text-sm mt-0.5">
                                Panorâmica geral da clínica
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Procurar paciente..."
                                    className="pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-card-foreground w-64 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all placeholder-muted-foreground"
                                />
                            </div>

                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-card-foreground hover:bg-muted">
                                <Bell className="h-5 w-5" />
                            </Button>

                            {canEdit && (
                                <Button className="bg-amber-600 text-white hover:bg-amber-500 shadow-md font-medium px-4">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Novo Paciente
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="container mx-auto px-6 py-8 space-y-8 bg-background min-h-screen">

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Pacientes Ativos', value: '1,248', change: '+12%', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/15' },
                        { label: 'Consultas Hoje', value: '24', change: '-2%', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/15' },
                        { label: 'Faturação Mês', value: '€ 12.4k', change: '+8%', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/15' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-card p-6 rounded-xl border border-border shadow-soft hover:shadow-float transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</h3>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stat.bg} ${stat.color}`}>
                                    {stat.change}
                                </span>
                            </div>
                            <div className="text-3xl font-bold text-card-foreground">{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Módulos Rápidos */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-card-foreground">Acesso Rápido</h2>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-card-foreground hover:bg-muted"><Grid className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-card-foreground hover:bg-muted"><List className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { name: 'Fichas Clínicas', desc: 'Gerir pacientes e históricos', icon: User, color: 'bg-blue-600' },
                            { name: 'Agenda Médica', desc: 'Marcações e calendário', icon: Calendar, color: 'bg-indigo-600' },
                            { name: 'Faturação', desc: 'Emitir faturas e orçamentos', icon: Euro, color: 'bg-emerald-600' },
                        ].map((module) => (
                            <div key={module.name} className="group bg-card p-4 rounded-xl border border-border hover:border-amber-500/30 hover:shadow-float transition-all cursor-pointer flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center text-white shadow-lg`}>
                                    <module.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-card-foreground group-hover:text-amber-500 transition-colors">{module.name}</h4>
                                    <p className="text-sm text-muted-foreground">{module.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
                    <p>Ligado como <span className="font-medium text-card-foreground">{user?.full_name || user?.email || 'Utilizador'}</span> • AsymLAB v2.4</p>
                </div>
            </div>
        </PermissionGuard>
    );
}
