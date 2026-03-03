'use client';

import { supabase } from '@/lib/supabase';

// === Tipos ===

export interface QueueWaitThresholds {
    amber_days: number;
    red_days: number;
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
