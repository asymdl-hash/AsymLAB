'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Plus, Search, Bell, Grid, List, Calendar, Euro } from 'lucide-react';

/* 
 * Dashboard Page - Estilo Soft SaaS Premium (Mobbin/Refero)
 * Layout limpo, minimalista e arejado.
 */

export default function DashboardPage() {
    const [userEmail, setUserEmail] = useState<string>('');

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await auth.getUser();
            if (user) {
                setUserEmail(user.email || '');
            }
        };
        getUser();
    }, []);

    return (
        <>
            {/* Header Limpo e Moderno (Soft Style) */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                            <p className="text-gray-500 text-sm mt-0.5">
                                Panorâmica geral da clínica
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search Bar (Simulada) */}
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Procurar paciente..."
                                    className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>

                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                                <Bell className="h-5 w-5" />
                            </Button>

                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md font-medium px-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Paciente
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal (Scrollable) */}
            <div className="container mx-auto px-6 py-8 space-y-8 bg-[#f9fafb] min-h-screen">

                {/* Stats Cards (Mobbin Style - Clean & White) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Pacientes Ativos', value: '1,248', change: '+12%', color: 'text-green-600', bg: 'bg-green-50' },
                        { label: 'Consultas Hoje', value: '24', change: '-2%', color: 'text-orange-500', bg: 'bg-orange-50' },
                        { label: 'Faturação Mês', value: '€ 12.4k', change: '+8%', color: 'text-blue-600', bg: 'bg-blue-50' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{stat.label}</h3>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stat.bg} ${stat.color}`}>
                                    {stat.change}
                                </span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Section: Módulos Rápidos */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Acesso Rápido</h2>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-gray-400"><Grid className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-gray-400"><List className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { name: 'Fichas Clínicas', desc: 'Gerir pacientes e históricos', icon: User, color: 'bg-blue-500' },
                            { name: 'Agenda Médica', desc: 'Marcações e calendário', icon: Calendar, color: 'bg-indigo-500' },
                            { name: 'Faturação', desc: 'Emitir faturas e orçamentos', icon: Euro, color: 'bg-emerald-500' },
                        ].map((module) => (
                            <div key={module.name} className="group bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center text-white shadow-lg`}>
                                    <module.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{module.name}</h4>
                                    <p className="text-sm text-gray-500">{module.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Welcome Info (Subtle Footer) */}
                <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-400">
                    <p>Ligado como <span className="font-medium text-gray-600">{userEmail}</span> • AsymLAB v2.4 (Soft SaaS)</p>
                </div>
            </div>
        </>
    );
}
