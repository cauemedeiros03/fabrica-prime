-- 1. Adicionar colunas nome e email na tabela public.profiles se não existirem
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Atualizar a função do trigger handle_new_user para copiar e-mail e nome (do metadata do cadastro)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 3. Garantir que o trigger de criação esteja ativo no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Migração: Atualizar os usuários já cadastrados na tabela auth.users para a tabela public.profiles
INSERT INTO public.profiles (id, nome, email)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'nome', raw_user_meta_data->>'full_name', email) AS nome,
  email
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
  nome = COALESCE(public.profiles.nome, EXCLUDED.nome),
  email = COALESCE(public.profiles.email, EXCLUDED.email),
  updated_at = now();
