-- ============================================================
-- F5: Chat Interno — Tabela de mensagens + Storage bucket
-- Decisões: D-CHAT-01 a D-CHAT-05, D-PAC-01
-- Chat por paciente (thread único), apenas staff lab
-- ============================================================

-- Tabela principal de mensagens
CREATE TABLE IF NOT EXISTS internal_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'staff_lab',
  content TEXT NOT NULL DEFAULT '',
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  attachments JSONB DEFAULT '[]'::jsonb,
  reply_to UUID REFERENCES internal_chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chat_patient_created ON internal_chat_messages(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sender ON internal_chat_messages(sender_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chat_updated_at
  BEFORE UPDATE ON internal_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();

-- RLS
ALTER TABLE internal_chat_messages ENABLE ROW LEVEL SECURITY;

-- Staff pode ler todas as mensagens
CREATE POLICY "Staff can read chat messages"
  ON internal_chat_messages FOR SELECT
  USING (true);

-- Staff pode inserir mensagens (sender_id = auth.uid)
CREATE POLICY "Staff can insert chat messages"
  ON internal_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Staff pode editar as próprias mensagens
CREATE POLICY "Staff can update own messages"
  ON internal_chat_messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE internal_chat_messages;

-- Storage bucket para anexos do chat
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload chat attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view chat attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');
