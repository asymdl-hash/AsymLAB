'use client';

import { supabase } from '@/lib/supabase';

// === Tipos ===

export interface QueueWaitThresholds {
    amber_days: number;
    red_days: number;
    warn_color?: string;   // cor do nível intermédio (default: 'amber')
    danger_color?: string; // cor do nível crítico (default: 'red')
}

// Paleta de cores disponíveis para badges
export const BADGE_COLOR_OPTIONS = [
    { id: 'amber', label: 'Âmbar', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
    { id: 'orange', label: 'Laranja', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500' },
    { id: 'red', label: 'Vermelho', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
    { id: 'rose', label: 'Rosa', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-500' },
    { id: 'yellow', label: 'Amarelo', bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
    { id: 'blue', label: 'Azul', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
    { id: 'purple', label: 'Púrpura', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500' },
    { id: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
] as const;

export type BadgeColorId = typeof BADGE_COLOR_OPTIONS[number]['id'];

export function getBadgeClasses(colorId: string): string {
    const color = BADGE_COLOR_OPTIONS.find(c => c.id === colorId);
    if (!color) return 'text-gray-500 bg-muted border-border';
    return `${color.text} ${color.bg} ${color.border}`;
}

// Cache em memória (evita queries repetidas na mesma sessão)
const cache: Record<string, { value: unknown; ts: number }> = {};
const CACHE_TTL = 60_000; // 1 minuto

export const settingsService = {

    /**
     * Ler uma configuração por chave
     */
    async get<T = unknown>(key: string): Promise<T | null> {
        // Cache hit?
        const cached = cache[key];
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            return cached.value as T;
        }

        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error) {
            console.error(`[settingsService] Erro ao ler '${key}':`, error);
            return null;
        }

        const val = data?.value as T;
        cache[key] = { value: val, ts: Date.now() };
        return val;
    },

    /**
     * Actualizar uma configuração
     */
    async set(key: string, value: unknown): Promise<void> {
        const { error } = await supabase
            .from('app_settings')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('key', key);

        if (error) {
            console.error(`[settingsService] Erro ao guardar '${key}':`, error);
            throw error;
        }

        // Invalidar cache
        cache[key] = { value, ts: Date.now() };
    },

    /**
     * Ler thresholds da fila de pedidos (com fallback)
     */
    async getQueueThresholds(): Promise<QueueWaitThresholds> {
        const val = await this.get<QueueWaitThresholds>('queue_wait_thresholds');
        return val || { amber_days: 1, red_days: 3 };
    },

    /**
     * Guardar thresholds da fila de pedidos
     */
    async setQueueThresholds(thresholds: QueueWaitThresholds): Promise<void> {
        await this.set('queue_wait_thresholds', thresholds);
    },
};
