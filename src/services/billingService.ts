'use client';

import { supabase } from '@/lib/supabase';

// === Tipos ===

export interface Invoice {
    id: string;
    patient_id: string;
    plan_id: string | null;
    phase_id: string | null;
    clinica_id: string | null;
    numero: string;
    valor: number;
    descricao: string | null;
    estado: 'rascunho' | 'emitida' | 'paga' | 'anulada';
    pdf_url: string | null;
    pdf_nome: string | null;
    notas: string | null;
    emitida_por: string | null;
    emitida_at: string | null;
    created_at: string;
    updated_at: string;
    // joins
    plan?: { id: string; nome: string } | null;
    phase?: { id: string; nome: string } | null;
    clinica?: { id: string; commercial_name: string } | null;
}

export interface Receipt {
    id: string;
    invoice_id: string;
    patient_id: string;
    numero: string;
    valor: number;
    metodo_pagamento: string;
    pdf_url: string | null;
    pdf_nome: string | null;
    notas: string | null;
    emitido_por: string | null;
    emitido_at: string;
    created_at: string;
    // joins
    invoice?: { id: string; numero: string; valor: number } | null;
}

export interface PatientDocument {
    id: string;
    patient_id: string;
    plan_id: string | null;
    nome: string;
    tipo: 'guia_transporte' | 'encomenda' | 'digitalizacao' | 'outro';
    file_url: string | null;
    file_nome: string | null;
    file_tipo: string | null;
    notas: string | null;
    uploaded_by: string | null;
    uploaded_at: string;
    created_at: string;
}

// Estado labels/cores
export const INVOICE_STATE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    rascunho: { label: 'Rascunho', color: 'text-gray-400', bg: 'bg-gray-500/20' },
    emitida: { label: 'Emitida', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    paga: { label: 'Paga', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    anulada: { label: 'Anulada', color: 'text-red-400', bg: 'bg-red-500/20' },
};

export const DOC_TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
    guia_transporte: { label: 'Guia de Transporte', emoji: '🚚' },
    encomenda: { label: 'Encomenda', emoji: '📦' },
    digitalizacao: { label: 'Digitalização', emoji: '📷' },
    outro: { label: 'Outro', emoji: '📄' },
};

export const PAYMENT_METHODS: Record<string, string> = {
    transferencia: 'Transferência',
    cheque: 'Cheque',
    numerario: 'Numerário',
    mbway: 'MBWay',
    multibanco: 'Multibanco',
    outro: 'Outro',
};

export const billingService = {

    // =================== FACTURAS ===================

    async getInvoices(patientId: string): Promise<Invoice[]> {
        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                plan:treatment_plans!invoices_plan_id_fkey (id, nome),
                phase:phases!invoices_phase_id_fkey (id, nome),
                clinica:clinics!invoices_clinica_id_fkey (id, commercial_name)
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar facturas:', error);
            throw error;
        }
        return (data || []) as Invoice[];
    },

    async createInvoice(data: {
        patient_id: string;
        plan_id?: string;
        phase_id?: string;
        clinica_id?: string;
        valor: number;
        descricao?: string;
        notas?: string;
        emitida_por?: string;
    }): Promise<Invoice> {
        // Gerar número automático
        const { data: numData } = await supabase.rpc('generate_invoice_number');
        const numero = numData || `F-${new Date().getFullYear()}/0000`;

        const { data: invoice, error } = await supabase
            .from('invoices')
            .insert({
                ...data,
                numero,
                estado: 'rascunho',
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar factura:', error);
            throw error;
        }
        return invoice as Invoice;
    },

    async updateInvoice(id: string, updates: Partial<Invoice>): Promise<void> {
        const { error } = await supabase
            .from('invoices')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Erro ao actualizar factura:', error);
            throw error;
        }
    },

    async uploadInvoicePDF(invoiceId: string, file: File): Promise<string> {
        const ext = file.name.split('.').pop() || 'pdf';
        const path = `invoices/${invoiceId}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('billing-files')
            .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('billing-files')
            .getPublicUrl(path);

        const pdf_url = urlData.publicUrl;

        await this.updateInvoice(invoiceId, {
            pdf_url,
            pdf_nome: file.name,
        } as Partial<Invoice>);

        return pdf_url;
    },

    // =================== RECIBOS ===================

    async getReceipts(patientId: string): Promise<Receipt[]> {
        const { data, error } = await supabase
            .from('receipts')
            .select(`
                *,
                invoice:invoices!receipts_invoice_id_fkey (id, numero, valor)
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar recibos:', error);
            throw error;
        }
        return (data || []) as Receipt[];
    },

    async createReceipt(data: {
        invoice_id: string;
        patient_id: string;
        valor: number;
        metodo_pagamento?: string;
        notas?: string;
        emitido_por?: string;
    }): Promise<Receipt> {
        const { data: numData } = await supabase.rpc('generate_receipt_number');
        const numero = numData || `R-${new Date().getFullYear()}/0000`;

        const { data: receipt, error } = await supabase
            .from('receipts')
            .insert({ ...data, numero })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar recibo:', error);
            throw error;
        }

        // Auto-marcar factura como paga
        await this.updateInvoice(data.invoice_id, { estado: 'paga' } as Partial<Invoice>);

        return receipt as Receipt;
    },

    // =================== DOCUMENTOS ===================

    async getDocuments(patientId: string): Promise<PatientDocument[]> {
        const { data, error } = await supabase
            .from('patient_documents')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar documentos:', error);
            throw error;
        }
        return (data || []) as PatientDocument[];
    },

    async uploadDocument(patientId: string, file: File, metadata: {
        nome: string;
        tipo: string;
        plan_id?: string;
        notas?: string;
        uploaded_by?: string;
    }): Promise<PatientDocument> {
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'bin';
        const path = `documents/${patientId}/${timestamp}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('billing-files')
            .upload(path, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('billing-files')
            .getPublicUrl(path);

        const { data: doc, error } = await supabase
            .from('patient_documents')
            .insert({
                patient_id: patientId,
                ...metadata,
                file_url: urlData.publicUrl,
                file_nome: file.name,
                file_tipo: file.type,
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao guardar documento:', error);
            throw error;
        }
        return doc as PatientDocument;
    },

    async deleteDocument(id: string): Promise<void> {
        const { error } = await supabase
            .from('patient_documents')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao apagar documento:', error);
            throw error;
        }
    },
};
