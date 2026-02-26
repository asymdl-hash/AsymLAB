-- V1.23.0: Adicionar coluna estado ao paciente
-- Estados: rascunho (default ao criar), activo (com plano activo), inactivo, arquivado
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'rascunho'
CHECK (estado IN ('rascunho', 'activo', 'inactivo', 'arquivado'));

-- Index para filtrar por estado
CREATE INDEX IF NOT EXISTS idx_patients_estado ON public.patients(estado);

-- Actualizar pacientes existentes: se tem planos activos -> activo, senão mantém rascunho
UPDATE public.patients p SET estado = 'activo'
WHERE EXISTS (
    SELECT 1 FROM public.treatment_plans tp 
    WHERE tp.patient_id = p.id 
    AND tp.estado IN ('activo', 'pausado', 'reaberto')
)
AND p.estado = 'rascunho';
