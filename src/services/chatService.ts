/**
 * Chat Interno Service — F5
 * Thread por paciente, apenas staff lab
 * D-CHAT-01 a D-CHAT-05, D-PAC-01
 */

import { supabase } from '@/lib/supabase';

// ===== TYPES =====

export interface ChatMessage {
    id: string;
    patient_id: string;
    sender_id: string;
    sender_name: string;
    sender_role: string;
    content: string;
    message_type: 'text' | 'image' | 'system';
    attachments: ChatAttachment[];
    reply_to: string | null;
    created_at: string;
    updated_at: string;
}

export interface ChatAttachment {
    url: string;
    filename: string;
    type: string;
    size: number;
}

export interface SendMessageParams {
    patientId: string;
    content: string;
    messageType?: 'text' | 'image' | 'system';
    attachments?: ChatAttachment[];
    replyTo?: string;
}

// ===== SERVICE =====

export const chatService = {
    /**
     * Obter mensagens de um paciente (paginação cursor-based)
     * D-PAC-01: cache últimas 50-100 mensagens
     */
    async getMessages(
        patientId: string,
        limit: number = 50,
        before?: string
    ): Promise<ChatMessage[]> {
        let query = supabase
            .from('internal_chat_messages')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (before) {
            query = query.lt('created_at', before);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[chatService] getMessages error:', error);
            return [];
        }

        // Reverter para ordem cronológica (mais antigas primeiro)
        return (data || []).reverse();
    },

    /**
     * Enviar mensagem
     */
    async sendMessage(params: SendMessageParams): Promise<ChatMessage | null> {
        // Obter dados do utilizador actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('[chatService] No authenticated user');
            return null;
        }

        const { data, error } = await supabase
            .from('internal_chat_messages')
            .insert({
                patient_id: params.patientId,
                sender_id: user.id,
                sender_name: user.user_metadata?.name || user.email || 'Staff',
                sender_role: user.user_metadata?.role || 'staff_lab',
                content: params.content,
                message_type: params.messageType || 'text',
                attachments: params.attachments || [],
                reply_to: params.replyTo || null,
            })
            .select()
            .single();

        if (error) {
            console.error('[chatService] sendMessage error:', error);
            return null;
        }

        return data;
    },

    /**
     * Upload de anexo para Supabase Storage
     */
    async uploadAttachment(
        patientId: string,
        file: File
    ): Promise<ChatAttachment | null> {
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
        const path = `${patientId}/${filename}`;

        const { error } = await supabase.storage
            .from('chat-attachments')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error('[chatService] uploadAttachment error:', error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(path);

        return {
            url: publicUrl,
            filename: file.name,
            type: file.type,
            size: file.size,
        };
    },

    /**
     * Subscrever a mensagens em tempo real (Supabase Realtime)
     */
    subscribeToMessages(
        patientId: string,
        onNewMessage: (message: ChatMessage) => void
    ) {
        const channel = supabase
            .channel(`chat:${patientId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'internal_chat_messages',
                    filter: `patient_id=eq.${patientId}`,
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (payload: any) => {
                    onNewMessage(payload.new as ChatMessage);
                }
            )
            .subscribe();

        // Retornar função de cleanup
        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Contar mensagens (placeholder para F5b)
     */
    async getMessageCount(patientId: string): Promise<number> {
        const { count, error } = await supabase
            .from('internal_chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', patientId);

        if (error) return 0;
        return count || 0;
    },
};
