-- Corrige as políticas da tabela profiles para usar a coluna id ao invés de user_id
DROP POLICY IF EXISTS "Usuários veem o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários atualizam o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários inserem o próprio perfil" ON public.profiles;

CREATE POLICY "Usuários veem o próprio perfil" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Usuários atualizam o próprio perfil" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Usuários inserem o próprio perfil" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Atualiza a função do trigger para novos usuários para usar id ao invés de user_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;
