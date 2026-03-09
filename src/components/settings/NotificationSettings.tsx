'use client';

import { useState, useEffect } from 'react';
import {
    FileText,
    Clock,
    MessageCircle,
    Bell,
    Save,
    Loader2,
    Info,
    CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Tipos ──

interface DraftSettings {
    draft_expiration_days: number;
    draft_whatsapp_enabled: boolean;
    draft_reminder_hours: number;
}

const DEFAULT_SETTINGS: DraftSettings = {
    draft_expiration_days: 2,
    draft_whatsapp_enabled: true,
    draft_reminder_hours: 24,
};

const EXPIRATION_OPTIONS = [
    { value: 1, label: '1 dia' },
    { value: 2, label: '2 dias' },
    { value: 3, label: '3 dias' },
    { value: 5, label: '5 dias' },
    { value: 7, label: '7 dias' },
];

const REMINDER_OPTIONS = [
    { value: 6, label: '6 horas antes' },
    { value: 12, label: '12 horas antes' },
    { value: 24, label: '24 horas antes' },
];

// ── Componente Principal ──

export default function NotificationSettings() {
    const [settings, setSettings] = useState<DraftSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Carregar configurações
    useEffect(() => {
        async function loadSettings() {
            try {
                const { data } = await supabase
                    .from('app_settings')
                    .select('key, value')
                    .in('key', ['draft_expiration_days', 'draft_whatsapp_enabled', 'draft_reminder_hours']);

                if (data && data.length > 0) {
                    const loaded = { ...DEFAULT_SETTINGS };
                    for (const row of data) {
                        if (row.key === 'draft_expiration_days') loaded.draft_expiration_days = Number(row.value);
                        if (row.key === 'draft_whatsapp_enabled') loaded.draft_whatsapp_enabled = row.value === 'true';
                        if (row.key === 'draft_reminder_hours') loaded.draft_reminder_hours = Number(row.value);
                    }
                    setSettings(loaded);
                }
            } catch (err) {
                console.error('[Settings] Erro ao carregar configurações:', err);
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, []);

    // Guardar configurações
    const handleSave = async () => {
        try {
            setSaving(true);
            const entries = [
                { key: 'draft_expiration_days', value: String(settings.draft_expiration_days) },
                { key: 'draft_whatsapp_enabled', value: String(settings.draft_whatsapp_enabled) },
                { key: 'draft_reminder_hours', value: String(settings.draft_reminder_hours) },
            ];

            for (const entry of entries) {
                await supabase
                    .from('app_settings')
                    .upsert(entry, { onConflict: 'key' });
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error('[Settings] Erro ao guardar:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl space-y-8">
            {/* ═══ Secção: Rascunho Plano de Tratamento ═══ */}
            <section>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                        <FileText className="h-4.5 w-4.5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">
                            Rascunho Plano de Tratamento
                        </h3>
                        <p className="text-xs text-gray-500">
                            Configuração do sistema de rascunhos e notificações automáticas
                        </p>
                    </div>
                </div>

                {/* Explicação geral */}
                <div className="mt-4 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex gap-2">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800 space-y-1">
                            <p className="font-medium">Como funciona este sistema?</p>
                            <p className="text-blue-700 text-xs leading-relaxed">
                                Quando um utilizador abre o modal &quot;Criar Plano de Tratamento&quot; e clica em
                                &quot;Guardar Rascunho&quot;, os dados do plano são guardados temporariamente na base de dados.
                                Ao reabrir o modal para o mesmo paciente, os dados são automaticamente restaurados.
                                Se o rascunho não for finalizado dentro do prazo configurado, é automaticamente eliminado
                                e uma notificação é enviada via WhatsApp.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Cards de configuração */}
                <div className="space-y-4">

                    {/* ── 1. Tempo de Expiração ── */}
                    <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Clock className="h-4 w-4 text-orange-500" />
                            </div>
                            <div className="flex-1">
                                <label className="text-sm font-medium text-gray-900 block">
                                    Tempo de Expiração
                                </label>
                                <p className="text-xs text-gray-500 mt-1 mb-3 leading-relaxed">
                                    Define o número de dias que um rascunho pode ficar pendente antes de ser
                                    automaticamente eliminado. Após este período, o rascunho é apagado da base de dados
                                    e o utilizador terá de criar um novo plano de raiz.
                                    <strong> Valor recomendado: 2 dias.</strong>
                                </p>
                                <select
                                    value={settings.draft_expiration_days}
                                    onChange={e => setSettings(s => ({ ...s, draft_expiration_days: Number(e.target.value) }))}
                                    className="w-full sm:w-48 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
                                >
                                    {EXPIRATION_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── 2. Notificação WhatsApp ── */}
                    <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <MessageCircle className="h-4 w-4 text-green-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-900">
                                        Notificação WhatsApp
                                    </label>
                                    <button
                                        onClick={() => setSettings(s => ({ ...s, draft_whatsapp_enabled: !s.draft_whatsapp_enabled }))}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.draft_whatsapp_enabled ? 'bg-green-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${settings.draft_whatsapp_enabled ? 'translate-x-6' : 'translate-x-1'
                                            }`} />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    Quando ativado, o sistema envia automaticamente uma mensagem para o
                                    <strong> grupo de WhatsApp do paciente</strong>, mencionando o <strong>médico principal</strong> (@mention),
                                    em dois momentos: um <strong>lembrete</strong> antes da expiração e uma <strong>notificação</strong> quando
                                    o rascunho é eliminado. Isto garante que o médico responsável é alertado
                                    e pode finalizar o plano a tempo.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── 3. Lembrete Antecipado ── */}
                    <div className={`p-4 bg-white border border-gray-200 rounded-xl transition-opacity ${!settings.draft_whatsapp_enabled ? 'opacity-50 pointer-events-none' : ''
                        }`}>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Bell className="h-4 w-4 text-purple-500" />
                            </div>
                            <div className="flex-1">
                                <label className="text-sm font-medium text-gray-900 block">
                                    Lembrete Antecipado
                                </label>
                                <p className="text-xs text-gray-500 mt-1 mb-3 leading-relaxed">
                                    Define quantas horas antes da expiração o sistema deve enviar o lembrete via WhatsApp.
                                    Por exemplo, se definir &quot;24 horas antes&quot; e o rascunho expira em 2 dias,
                                    o lembrete será enviado ao fim de 1 dia. Esta opção <strong>só funciona</strong> se
                                    a notificação WhatsApp estiver ativada acima.
                                </p>
                                <select
                                    value={settings.draft_reminder_hours}
                                    onChange={e => setSettings(s => ({ ...s, draft_reminder_hours: Number(e.target.value) }))}
                                    className="w-full sm:w-48 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
                                >
                                    {REMINDER_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botão Guardar */}
                <div className="mt-6 flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : saved ? (
                            <CheckCircle2 className="h-4 w-4" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {saving ? 'A guardar...' : saved ? 'Guardado!' : 'Guardar Alterações'}
                    </button>
                    {saved && (
                        <span className="text-xs text-green-600 animate-fade-in">
                            ✅ Configurações guardadas com sucesso
                        </span>
                    )}
                </div>
            </section>
        </div>
    );
}
