ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.pagamentos REPLICA IDENTITY FULL;
ALTER TABLE public.etapas_pedido REPLICA IDENTITY FULL;
ALTER TABLE public.clientes REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pagamentos;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.etapas_pedido;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;