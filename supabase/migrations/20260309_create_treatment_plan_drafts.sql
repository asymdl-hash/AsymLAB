-- V2.19.0: Tabela para rascunhos de planos de tratamento
-- Executar manualmente no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS treatment_plan_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    draft_data JSONB NOT NULL DEFAULT '{}',
    photo_previews JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '2 days'),
    UNIQUE(patient_id)
);

ALTER TABLE treatment_plan_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own drafts"
ON treatment_plan_drafts FOR ALL
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());
