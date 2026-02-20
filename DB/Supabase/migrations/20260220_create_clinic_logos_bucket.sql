-- Criar bucket público para logos de clínicas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic-logos',
  'clinic-logos',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- RLS: leitura pública
CREATE POLICY "Public clinic logo access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clinic-logos');

-- RLS: upload por utilizadores autenticados
CREATE POLICY "Authenticated users can upload clinic logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'clinic-logos' AND auth.role() = 'authenticated');

-- RLS: update por utilizadores autenticados
CREATE POLICY "Authenticated users can update clinic logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'clinic-logos' AND auth.role() = 'authenticated');

-- RLS: delete por utilizadores autenticados
CREATE POLICY "Authenticated users can delete clinic logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'clinic-logos' AND auth.role() = 'authenticated');
