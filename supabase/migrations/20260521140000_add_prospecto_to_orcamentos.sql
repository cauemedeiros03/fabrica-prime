-- Adicionar colunas temporárias de prospecto na tabela orcamentos_salvos
ALTER TABLE public.orcamentos_salvos ADD COLUMN IF NOT EXISTS prospecto_nome TEXT;
ALTER TABLE public.orcamentos_salvos ADD COLUMN IF NOT EXISTS prospecto_telefone TEXT;
ALTER TABLE public.orcamentos_salvos ADD COLUMN IF NOT EXISTS prospecto_cidade TEXT;

-- Migrar dados existentes de cliente_* para prospecto_*
UPDATE public.orcamentos_salvos 
SET 
  prospecto_nome = cliente_nome,
  prospecto_telefone = cliente_telefone,
  prospecto_cidade = cliente_cidade
WHERE prospecto_nome IS NULL;
