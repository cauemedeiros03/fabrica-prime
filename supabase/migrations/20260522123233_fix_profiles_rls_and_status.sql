-- Garante que a coluna status_assinatura existe na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_assinatura TEXT DEFAULT 'inativo';

-- Garante que o RLS está ativado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Garante a política de SELECT para que o usuário logado possa ler o próprio perfil
DROP POLICY IF EXISTS "Usuários veem o próprio perfil" ON public.profiles;

CREATE POLICY "Usuários veem o próprio perfil" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
