
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'producao', 'financeiro', 'vendedor');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Usuários veem o próprio perfil" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuários atualizam o próprio perfil" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuários inserem o próprio perfil" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários veem os próprios papéis" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins gerenciam papéis" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cria perfil + papel admin para novos cadastros
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Endurece RLS das tabelas existentes (remove leitura pública)
DROP POLICY IF EXISTS "Leitura pública temporária de clientes" ON public.clientes;
DROP POLICY IF EXISTS "Leitura pública temporária de pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Atualização aberta temporária de pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Leitura pública temporária de etapas" ON public.etapas_pedido;
DROP POLICY IF EXISTS "Leitura pública temporária de pagamentos" ON public.pagamentos;

CREATE POLICY "Equipe autenticada lê clientes" ON public.clientes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Equipe autenticada lê pedidos" ON public.pedidos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Equipe autenticada atualiza pedidos" ON public.pedidos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Equipe autenticada lê etapas" ON public.etapas_pedido
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Equipe autenticada lê pagamentos" ON public.pagamentos
  FOR SELECT TO authenticated USING (true);

-- Numeração automática de pedidos (#1048, #1049, ...)
CREATE SEQUENCE IF NOT EXISTS public.pedidos_numero_seq START 1048;

CREATE OR REPLACE FUNCTION public.set_pedido_numero()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := '#' || nextval('public.pedidos_numero_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pedidos_set_numero
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.set_pedido_numero();

CREATE TRIGGER pedidos_set_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER clientes_set_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
