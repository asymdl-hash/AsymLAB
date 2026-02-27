'use client';

import { useState } from 'react';
import { Settings, Database, Shield, Bell, Palette, Users, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import BackupSettings from '@/components/settings/BackupSettings';
import UserManagement from '@/components/settings/UserManagement';
import CatalogManager from '@/components/settings/CatalogManager';
import PermissionGuard from '@/components/PermissionGuard';

interface SettingsTab {
    id: string;
    label: string;
    icon: React.ElementType;
    description: string;
}

const settingsTabs: SettingsTab[] = [
    {
        id: 'catalogs',
        label: 'Catálogos',
        icon: BookOpen,
        description: 'Gestão de tipos de trabalho, materiais, cores, templates e estados'
    },
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
        label: 'Utilizadores',
        icon: Users,
        description: 'Gestão de utilizadores e permissões'
    },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('catalogs');

    const activeTabConfig = settingsTabs.find(t => t.id === activeTab);

    return (
        <PermissionGuard module="settings">
            <div className="flex h-full w-full bg-background overflow-hidden">
                {/* Sidebar de Tabs */}
                <div className="w-64 flex-shrink-0 border-r border-border bg-card h-full overflow-y-auto">
                    <div className="p-6 border-b border-border">
                        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Settings className="h-5 w-5 text-amber-500" />
                            Definições
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Configurações do sistema</p>
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
                                            ? "bg-amber-500/15 text-amber-400"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-amber-400" : "text-gray-500")} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 overflow-y-auto">
                    {/* Header da secção */}
                    <div className="bg-card border-b border-border px-8 py-6">
                        <h2 className="text-xl font-semibold text-white">{activeTabConfig?.label}</h2>
                        <p className="text-sm text-gray-500 mt-1">{activeTabConfig?.description}</p>
                    </div>

                    {/* Conteúdo da tab */}
                    <div className="p-8">
                        {activeTab === 'catalogs' && <CatalogManager />}
                        {activeTab === 'backups' && <BackupSettings />}
                        {activeTab === 'general' && (
                            <div className="text-center py-16 text-gray-500">
                                <Settings className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Configurações gerais — em desenvolvimento</p>
                            </div>
                        )}
                        {activeTab === 'notifications' && (
                            <div className="text-center py-16 text-gray-500">
                                <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Notificações — em desenvolvimento</p>
                            </div>
                        )}
                        {activeTab === 'appearance' && (
                            <div className="text-center py-16 text-gray-500">
                                <Palette className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Aparência — em desenvolvimento</p>
                            </div>
                        )}
                        {activeTab === 'security' && <UserManagement />}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    );
}
