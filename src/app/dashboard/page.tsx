'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Plus } from 'lucide-react';

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
        <DashboardLayout>
            {/* Header Dark - Fica atrás */}
            <div className="bg-[#1e293b] pb-32">
                <div className="container mx-auto px-6 pt-8 pb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                            <p className="text-gray-400 text-sm">
                                Gestão clínica e laboratório unificada
                            </p>
                        </div>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Paciente
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content - UM ÚNICO container branco que sobrepõe o header */}
            <div className="container mx-auto px-6 -mt-20 pb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {/* Welcome Section */}
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Bem-vindo ao AsymLAB</h2>
                        <p className="text-sm text-gray-600">
                            Conectado como: <span className="text-blue-600 font-medium">{userEmail}</span>
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-md mb-6">
                        <p className="text-sm text-gray-700 leading-relaxed">
                            Sistema de gestão clínica integrado com funcionalidades de agendamento,
                            faturação e relatórios. Use o menu lateral para navegar entre os módulos.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Pacientes Ativos</span>
                            <Badge variant="success">12</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Consultas Hoje</span>
                            <Badge variant="info">5</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Pendentes</span>
                            <Badge variant="warning">3</Badge>
                        </div>
                    </div>

                    {/* Modules Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Módulos Disponíveis</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Aceda aos diferentes módulos do sistema através da barra lateral
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                { name: 'Pacientes', desc: 'Gestão de fichas clínicas', status: 'Ativo' },
                                { name: 'Agenda', desc: 'Marcações e consultas', status: 'Ativo' },
                                { name: 'Faturação', desc: 'Gestão financeira', status: 'Ativo' },
                                { name: 'Relatórios', desc: 'Análises e estatísticas', status: 'Ativo' },
                                { name: 'Definições', desc: 'Configurações do sistema', status: 'Ativo' },
                            ].map((module) => (
                                <div
                                    key={module.name}
                                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <User className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-sm text-gray-900">{module.name}</h4>
                                            <Badge variant="success" className="text-xs">{module.status}</Badge>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-0.5">{module.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
