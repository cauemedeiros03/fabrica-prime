DROP POLICY IF EXISTS "Equipe autenticada pode ver clientes" ON public.clientes;
DROP POLICY IF EXISTS "Equipe autenticada pode ver pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Equipe autenticada pode ver etapas" ON public.etapas_pedido;
DROP POLICY IF EXISTS "Equipe autenticada pode ver pagamentos" ON public.pagamentos;

CREATE POLICY "Leitura pública temporária de clientes" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "Leitura pública temporária de pedidos" ON public.pedidos FOR SELECT USING (true);
CREATE POLICY "Leitura pública temporária de etapas" ON public.etapas_pedido FOR SELECT USING (true);
CREATE POLICY "Leitura pública temporária de pagamentos" ON public.pagamentos FOR SELECT USING (true);

-- Permitir update de etapas sem login enquanto o kanban roda em modo demo
DROP POLICY IF EXISTS "Equipe autenticada pode editar pedidos" ON public.pedidos;
CREATE POLICY "Atualização aberta temporária de pedidos" ON public.pedidos FOR UPDATE USING (true) WITH CHECK (true);