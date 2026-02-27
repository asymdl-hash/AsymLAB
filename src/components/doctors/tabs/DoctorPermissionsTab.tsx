'use client';

import { Shield, Lock, Eye, CheckCircle2, MessageCircle } from 'lucide-react';
import { PERMISSIONS_MATRIX, ACCESS_LABELS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const MODULE_LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    clinics: 'Clínicas',
    doctors: 'Médicos',
    patients: 'Pacientes',
    schedule: 'Agenda',
    billing: 'Faturação',
    reports: 'Relatórios',
    settings: 'Definições',
};

export default function DoctorPermissionsTab() {
    const doctorPerms = PERMISSIONS_MATRIX['doctor'];

    return (
        <div className="space-y-8">
            {/* ============ PERMISSÕES POR MÓDULO ============ */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-gray-900">Permissões por Módulo</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    As permissões são definidas pelo role do utilizador. Futuras versões irão permitir
                    overrides individuais por médico.
                </p>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Módulo
                                </th>
                                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nível de Acesso
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {Object.entries(doctorPerms).map(([module, level]) => (
                                <tr key={module} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-medium text-gray-700">
                                            {MODULE_LABELS[module] || module}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                                            level === 'full' && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                            level === 'read' && "bg-blue-50 text-blue-700 border border-blue-200",
                                            level === 'none' && "bg-gray-50 text-muted-foreground border border-gray-200",
                                        )}>
                                            {level === 'full' && <CheckCircle2 className="h-3 w-3" />}
                                            {level === 'read' && <Eye className="h-3 w-3" />}
                                            {level === 'none' && <Lock className="h-3 w-3" />}
                                            {ACCESS_LABELS[level]}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ============ WHATSAPP (FUTURO) ============ */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-semibold text-gray-900">WhatsApp</h3>
                </div>

                <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6 text-center">
                    <MessageCircle className="h-8 w-8 text-card-foreground/80 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                        Configurações de permissões do WhatsApp para este médico.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Controlo de comandos @, ações do Z-API, e notificações.
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 mt-3">
                        Em breve
                    </span>
                </div>
            </div>
        </div>
    );
}
