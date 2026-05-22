-- Criar tabela orcamentos_salvos
CREATE TABLE IF NOT EXISTS public.orcamentos_salvos (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID NOT NULL DEFAULT auth.uid(),
    
    -- Dados do Cliente
    cliente_nome TEXT NOT NULL,
    cliente_telefone TEXT,
    cliente_cidade TEXT,
    
    -- Dados do Produto
    produto_descricao TEXT NOT NULL,
    produto_material TEXT,
    produto_medidas TEXT,
    
    -- Financeiro / Prazo
    valor_sugerido NUMERIC(10,2) NOT NULL,
    validade_dias INTEGER DEFAULT 15,
    
    CONSTRAINT orcamentos_salvos_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.orcamentos_salvos ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Users can insert their own budgets" ON public.orcamentos_salvos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own budgets" ON public.orcamentos_salvos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON public.orcamentos_salvos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON public.orcamentos_salvos
    FOR DELETE USING (auth.uid() = user_id);
