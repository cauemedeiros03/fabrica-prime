-- Criar tabela despesas
CREATE TABLE IF NOT EXISTS public.despesas (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID NOT NULL DEFAULT auth.uid(),
    
    descricao TEXT NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    
    CONSTRAINT despesas_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Users can insert their own expenses" ON public.despesas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own expenses" ON public.despesas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" ON public.despesas
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" ON public.despesas
    FOR DELETE USING (auth.uid() = user_id);
