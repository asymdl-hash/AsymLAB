-- ============================================================
-- Migration: Guias de Transporte e Recepção (V1.37.0)
-- Executar no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Guias de Transporte/Recepção
CREATE TABLE IF NOT EXISTS transport_guides (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    plan_id uuid REFERENCES treatment_plans(id) ON DELETE SET NULL,
    clinica_id uuid REFERENCES clinics(id) ON DELETE SET NULL,
    tipo text NOT NULL CHECK (tipo IN ('transporte', 'recepcao')),
    numero text NOT NULL,
    data_envio date DEFAULT CURRENT_DATE,
    estado text NOT NULL DEFAULT 'rascunho' CHECK (estado IN ('rascunho', 'enviado', 'entregue', 'recebido')),
    estado_recepcao text CHECK (estado_recepcao IN ('ok', 'danificado', 'incompleto')),
    notas text,
    fotos text[] DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Itens da guia (linha a linha)
CREATE TABLE IF NOT EXISTS guide_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    guide_id uuid NOT NULL REFERENCES transport_guides(id) ON DELETE CASCADE,
    nome text NOT NULL,
    quantidade int NOT NULL DEFAULT 1,
    observacao text,
    ordem int NOT NULL DEFAULT 0
);

-- 3. Catálogo de itens frequentes (aprende com o uso)
CREATE TABLE IF NOT EXISTS guide_item_catalog (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    clinica_id uuid REFERENCES clinics(id),
    tipo_trabalho_id uuid,
    uso_count int NOT NULL DEFAULT 0,
    last_used_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_transport_guides_patient ON transport_guides(patient_id);
CREATE INDEX IF NOT EXISTS idx_transport_guides_clinica ON transport_guides(clinica_id);
CREATE INDEX IF NOT EXISTS idx_transport_guides_tipo ON transport_guides(tipo);
CREATE INDEX IF NOT EXISTS idx_guide_items_guide ON guide_items(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_item_catalog_clinica ON guide_item_catalog(clinica_id);
CREATE INDEX IF NOT EXISTS idx_guide_item_catalog_uso ON guide_item_catalog(uso_count DESC);

-- Sequência para numeração automática
CREATE SEQUENCE IF NOT EXISTS guide_number_seq START 1;

-- Função para gerar número de guia automático
CREATE OR REPLACE FUNCTION generate_guide_number(guide_tipo text)
RETURNS text AS $$
BEGIN
    IF guide_tipo = 'transporte' THEN
        RETURN 'GT-' || EXTRACT(YEAR FROM now())::text || '/' || LPAD(nextval('guide_number_seq')::text, 4, '0');
    ELSE
        RETURN 'GR-' || EXTRACT(YEAR FROM now())::text || '/' || LPAD(nextval('guide_number_seq')::text, 4, '0');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE transport_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_item_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read guides" ON transport_guides FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage guides" ON transport_guides FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update guides" ON transport_guides FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can read guide items" ON guide_items FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage guide items" ON guide_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update guide items" ON guide_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete guide items" ON guide_items FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can read item catalog" ON guide_item_catalog FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage item catalog" ON guide_item_catalog FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update item catalog" ON guide_item_catalog FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Comentários
COMMENT ON TABLE transport_guides IS 'Guias de transporte (envio) e recepção de trabalhos';
COMMENT ON TABLE guide_items IS 'Itens individuais de cada guia';
COMMENT ON TABLE guide_item_catalog IS 'Catálogo de itens frequentes — aprende com o uso';
