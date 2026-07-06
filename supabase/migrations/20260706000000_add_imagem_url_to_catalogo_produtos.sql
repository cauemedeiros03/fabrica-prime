ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS imagem_url TEXT;

-- Crie o bucket 'produtos' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

-- Adicione políticas de acesso (RLS) para o bucket 'produtos'
DROP POLICY IF EXISTS "Permitir upload de produtos para equipe autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura de produtos para equipe autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão de produtos para equipe autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização de produtos para equipe autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública de produtos" ON storage.objects;

CREATE POLICY "Permitir upload de produtos para equipe autenticada"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'produtos');

CREATE POLICY "Permitir leitura pública de produtos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'produtos');

CREATE POLICY "Permitir exclusão de produtos para equipe autenticada"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'produtos');

CREATE POLICY "Permitir atualização de produtos para equipe autenticada"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'produtos')
WITH CHECK (bucket_id = 'produtos');
