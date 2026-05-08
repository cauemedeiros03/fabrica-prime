-- Enums
CREATE TYPE public.etapa_producao AS ENUM (
  'pedido-recebido',
  'separando-madeira',
  'corte',
  'montagem',
  'acabamento',
  'pintura',
  'qualidade',
  'pronto-entrega',
  'entregue'
);

CREATE TYPE public.prioridade_pedido AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Função genérica de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cidade TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe autenticada pode ver clientes"
  ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Equipe autenticada pode criar clientes"
  ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Equipe autenticada pode editar clientes"
  ON public.clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Equipe autenticada pode remover clientes"
  ON public.clientes FOR DELETE TO authenticated USING (true);

-- Pedidos
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  produto TEXT NOT NULL,
  tipo TEXT,
  material TEXT,
  cor TEXT,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  entrega DATE,
  etapa public.etapa_producao NOT NULL DEFAULT 'pedido-recebido',
  prioridade public.prioridade_pedido NOT NULL DEFAULT 'media',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX idx_pedidos_etapa ON public.pedidos(etapa);
CREATE INDEX idx_pedidos_entrega ON public.pedidos(entrega);

CREATE TRIGGER trg_pedidos_updated_at
BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe autenticada pode ver pedidos"
  ON public.pedidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Equipe autenticada pode criar pedidos"
  ON public.pedidos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Equipe autenticada pode editar pedidos"
  ON public.pedidos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Equipe autenticada pode remover pedidos"
  ON public.pedidos FOR DELETE TO authenticated USING (true);

-- Histórico de etapas
CREATE TABLE public.etapas_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  etapa_anterior public.etapa_producao,
  etapa_nova public.etapa_producao NOT NULL,
  observacao TEXT,
  autor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_etapas_pedido_pedido ON public.etapas_pedido(pedido_id);

ALTER TABLE public.etapas_pedido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe autenticada pode ver etapas"
  ON public.etapas_pedido FOR SELECT TO authenticated USING (true);
CREATE POLICY "Equipe autenticada pode criar etapas"
  ON public.etapas_pedido FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Equipe autenticada pode editar etapas"
  ON public.etapas_pedido FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Equipe autenticada pode remover etapas"
  ON public.etapas_pedido FOR DELETE TO authenticated USING (true);

-- Pagamentos
CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  valor NUMERIC(12,2) NOT NULL,
  forma TEXT,
  pago_em DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagamentos_pedido ON public.pagamentos(pedido_id);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe autenticada pode ver pagamentos"
  ON public.pagamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Equipe autenticada pode criar pagamentos"
  ON public.pagamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Equipe autenticada pode editar pagamentos"
  ON public.pagamentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Equipe autenticada pode remover pagamentos"
  ON public.pagamentos FOR DELETE TO authenticated USING (true);