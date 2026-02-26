-- ============================================================
-- Migration: Facturação Base (V1.36.0)
-- Executar no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Facturas (emitidas por fase)
CREATE TABLE IF NOT EXISTS invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    plan_id uuid REFERENCES treatment_plans(id) ON DELETE SET NULL,
    phase_id uuid REFERENCES phases(id) ON DELETE SET NULL,
    clinica_id uuid REFERENCES clinics(id) ON DELETE SET NULL,
    numero text NOT NULL,
    valor decimal(10,2) NOT NULL DEFAULT 0,
    descricao text,
    estado text NOT NULL DEFAULT 'rascunho' CHECK (estado IN ('rascunho', 'emitida', 'paga', 'anulada')),
    pdf_url text,
    pdf_nome text,
    notas text,
    emitida_por uuid REFERENCES auth.users(id),
    emitida_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Recibos (associados a facturas)
CREATE TABLE IF NOT EXISTS receipts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    numero text NOT NULL,
    valor decimal(10,2) NOT NULL DEFAULT 0,
    metodo_pagamento text DEFAULT 'transferencia' CHECK (metodo_pagamento IN ('transferencia', 'cheque', 'numerario', 'mbway', 'multibanco', 'outro')),
    pdf_url text,
    pdf_nome text,
    notas text,
    emitido_por uuid REFERENCES auth.users(id),
    emitido_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- 3. Documentos genéricos (guias, encomendas, digitalizações)
CREATE TABLE IF NOT EXISTS patient_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    plan_id uuid REFERENCES treatment_plans(id) ON DELETE SET NULL,
    nome text NOT NULL,
    tipo text NOT NULL DEFAULT 'outro' CHECK (tipo IN ('guia_transporte', 'encomenda', 'digitalizacao', 'outro')),
    file_url text,
    file_nome text,
    file_tipo text,
    notas text,
    uploaded_by uuid REFERENCES auth.users(id),
    uploaded_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_plan ON invoices(plan_id);
CREATE INDEX IF NOT EXISTS idx_invoices_phase ON invoices(phase_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_patient ON receipts(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient ON patient_documents(patient_id);

-- Sequência para numeração automática
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- Função para gerar número de factura automático
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
BEGIN
    RETURN 'F-' || EXTRACT(YEAR FROM now())::text || '/' || LPAD(nextval('invoice_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Função para gerar número de recibo automático
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
BEGIN
    RETURN 'R-' || EXTRACT(YEAR FROM now())::text || '/' || LPAD(nextval('receipt_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invoices" ON invoices FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update invoices" ON invoices FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can read receipts" ON receipts FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage receipts" ON receipts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update receipts" ON receipts FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can read patient_documents" ON patient_documents FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage patient_documents" ON patient_documents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update patient_documents" ON patient_documents FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete patient_documents" ON patient_documents FOR DELETE USING (auth.uid() IS NOT NULL);

-- Comentários
COMMENT ON TABLE invoices IS 'Facturas emitidas por fase do plano de tratamento';
COMMENT ON TABLE receipts IS 'Recibos de pagamento associados a facturas';
COMMENT ON TABLE patient_documents IS 'Documentos genéricos do paciente (guias, encomendas, etc.)';
