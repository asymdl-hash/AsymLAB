'use client';

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook para lock optimista via updated_at.
 * 
 * Guarda o timestamp de quando o registo foi carregado.
 * Antes de salvar, verifica se alguém alterou o registo entretanto.
 * Se sim, avisa o utilizador e opcionalmente recarrega os dados.
 * 
 * Uso:
 *   const lock = useOptimisticLock('patients', recordId);
 *   lock.setLoadedAt(record.updated_at); // ao carregar
 *   const ok = await lock.checkBeforeSave(); // antes de salvar
 *   if (!ok) return; // conflito detectado
 */

export interface OptimisticLockResult {
    /** Timestamp de quando o registo foi carregado */
    loadedAt: string | null;
    /** Definir o timestamp de load */
    setLoadedAt: (ts: string | null) => void;
    /** Verificar se há conflito antes de salvar. Retorna true se pode salvar. */
    checkBeforeSave: () => Promise<boolean>;
    /** Se há conflito activo */
    hasConflict: boolean;
    /** Nome/email de quem alterou (se disponível) */
    conflictUser: string | null;
    /** Limpar conflito (aceitar os dados actuais) */
    clearConflict: () => void;
    /** Actualizar o loadedAt para o valor actual (após resolver conflito) */
    refreshLoadedAt: () => Promise<void>;
}

export function useOptimisticLock(
    table: 'patients' | 'clinics' | 'treatment_plans',
    recordId: string | null
): OptimisticLockResult {
    const [loadedAt, setLoadedAt] = useState<string | null>(null);
    const [hasConflict, setHasConflict] = useState(false);
    const [conflictUser, setConflictUser] = useState<string | null>(null);
    const loadedAtRef = useRef<string | null>(null);

    const updateLoadedAt = useCallback((ts: string | null) => {
        setLoadedAt(ts);
        loadedAtRef.current = ts;
    }, []);

    const checkBeforeSave = useCallback(async (): Promise<boolean> => {
        if (!recordId || !loadedAtRef.current) return true; // sem lock, permite

        try {
            const { data, error } = await supabase
                .from(table)
                .select('updated_at')
                .eq('id', recordId)
                .single();

            if (error || !data) return true; // erro de rede, permite salvar

            const dbUpdatedAt = new Date(data.updated_at).getTime();
            const localLoadedAt = new Date(loadedAtRef.current).getTime();

            if (dbUpdatedAt > localLoadedAt) {
                // Conflito: alguém alterou o registo
                setHasConflict(true);
                return false;
            }

            return true;
        } catch {
            return true; // erro de rede, permite salvar
        }
    }, [recordId, table]);

    const clearConflict = useCallback(() => {
        setHasConflict(false);
        setConflictUser(null);
    }, []);

    const refreshLoadedAt = useCallback(async () => {
        if (!recordId) return;
        try {
            const { data } = await supabase
                .from(table)
                .select('updated_at')
                .eq('id', recordId)
                .single();

            if (data?.updated_at) {
                updateLoadedAt(data.updated_at);
            }
        } catch { /* ignore */ }
        clearConflict();
    }, [recordId, table, updateLoadedAt, clearConflict]);

    return {
        loadedAt,
        setLoadedAt: updateLoadedAt,
        checkBeforeSave,
        hasConflict,
        conflictUser,
        clearConflict,
        refreshLoadedAt,
    };
}
