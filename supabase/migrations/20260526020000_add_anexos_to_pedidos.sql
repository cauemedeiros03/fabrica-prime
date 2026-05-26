-- 1. Crie a nova coluna 'anexos' na tabela 'pedidos' se não existir
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS anexos text[] DEFAULT '{}'::text[];

-- 2. Crie o bucket 'anexos-pedidos' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('anexos-pedidos', 'anexos-pedidos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Adicione políticas de acesso (RLS) para o bucket
-- Remover se existirem para evitar erros de duplicidade ao reexecutar
DROP POLICY IF EXISTS "Permitir upload para equipe autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura para equipe autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão para equipe autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização para equipe autenticada" ON storage.objects;

-- Criar novas políticas
CREATE POLICY "Permitir upload para equipe autenticada"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'anexos-pedidos');

CREATE POLICY "Permitir leitura para equipe autenticada"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'anexos-pedidos');

CREATE POLICY "Permitir exclusão para equipe autenticada"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'anexos-pedidos');

CREATE POLICY "Permitir atualização para equipe autenticada"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'anexos-pedidos')
WITH CHECK (bucket_id = 'anexos-pedidos');
