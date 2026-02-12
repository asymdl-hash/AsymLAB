'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
            {/* Header Dark */}
            <div className="bg-[#1e293b] border-b border-gray-700">
                <div className="container mx-auto px-6 py-8">
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

            {/* Content */}
            <div className="container mx-auto px-6 py-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Welcome Card */}
                    <Card className="md:col-span-2 hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle>Bem-vindo ao AsymLAB</CardTitle>
                            <CardDescription>
                                Conectado como: <span className="text-blue-600 font-medium">{userEmail}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-md">
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    Sistema de gestão clínica integrado com funcionalidades de agendamento,
                                    faturação e relatórios. Use o menu lateral para navegar entre os módulos.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Card */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-lg">Estatísticas Rápidas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Pacientes Ativos</span>
                                <Badge variant="success">12</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Consultas Hoje</span>
                                <Badge variant="info">5</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Pendentes</span>
                                <Badge variant="warning">3</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Modules Card */}
                    <Card className="md:col-span-2 lg:col-span-3 hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle>Módulos Disponíveis</CardTitle>
                            <CardDescription>
                                Aceda aos diferentes módulos do sistema através da barra lateral
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
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
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
