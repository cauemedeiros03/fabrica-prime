-- Criar tabela assinaturas
CREATE TABLE IF NOT EXISTS public.assinaturas (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT CHECK (status IN ('active', 'past_due', 'unpaid', 'canceled')),
    data_expiracao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT assinaturas_pkey PRIMARY KEY (id),
    CONSTRAINT assinaturas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS: Apenas leitura para o usuário dono dos dados.
-- Inserções e atualizações são restritas à Service Role (que ignora RLS por padrão no backend).
CREATE POLICY "Permitir leitura apenas da própria assinatura" ON public.assinaturas
    FOR SELECT USING (auth.uid() = usuario_id);
