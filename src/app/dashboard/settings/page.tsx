'use client';

import { useState } from 'react';
import { Settings, Database, Shield, Bell, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import BackupSettings from '@/components/settings/BackupSettings';

interface SettingsTab {
    id: string;
    label: string;
    icon: React.ElementType;
    description: string;
}

const settingsTabs: SettingsTab[] = [
    {
        id: 'backups',
        label: 'Backups',
        icon: Database,
        description: 'Gestão de backups e redundância de dados'
    },
    {
        id: 'general',
        label: 'Geral',
        icon: Settings,
        description: 'Configurações gerais da aplicação'
    },
    {
        id: 'notifications',
        label: 'Notificações',
        icon: Bell,
        description: 'Preferências de notificações'
    },
    {
        id: 'appearance',
        label: 'Aparência',
        icon: Palette,
        description: 'Personalização visual'
    },
    {
        id: 'security',
        label: 'Segurança',
        icon: Shield,
        description: 'Controlo de acessos e permissões'
    },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('backups');

    const activeTabConfig = settingsTabs.find(t => t.id === activeTab);

    return (
        <div className="flex h-full w-full bg-gray-50/50 overflow-hidden">
            {/* Sidebar de Tabs */}
            <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white h-full overflow-y-auto">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Definições
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Configurações do sistema</p>
                </div>

                <nav className="p-3 space-y-1">
                    {settingsTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                )}
                            >
                                <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary" : "text-gray-400")} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto">
                {/* Header da secção */}
                <div className="bg-white border-b border-gray-200 px-8 py-6">
                    <h2 className="text-xl font-semibold text-gray-900">{activeTabConfig?.label}</h2>
                    <p className="text-sm text-gray-400 mt-1">{activeTabConfig?.description}</p>
                </div>

                {/* Conteúdo da tab */}
                <div className="p-8 max-w-4xl">
                    {activeTab === 'backups' && <BackupSettings />}
                    {activeTab === 'general' && (
                        <div className="text-center py-16 text-gray-400">
                            <Settings className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">Configurações gerais — em desenvolvimento</p>
                        </div>
                    )}
                    {activeTab === 'notifications' && (
                        <div className="text-center py-16 text-gray-400">
                            <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">Notificações — em desenvolvimento</p>
                        </div>
                    )}
                    {activeTab === 'appearance' && (
                        <div className="text-center py-16 text-gray-400">
                            <Palette className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">Aparência — em desenvolvimento</p>
                        </div>
                    )}
                    {activeTab === 'security' && (
                        <div className="text-center py-16 text-gray-400">
                            <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">Segurança — em desenvolvimento</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
