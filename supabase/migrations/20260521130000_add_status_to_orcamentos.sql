-- Adicionar coluna status na tabela orcamentos_salvos
ALTER TABLE public.orcamentos_salvos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pendente';
