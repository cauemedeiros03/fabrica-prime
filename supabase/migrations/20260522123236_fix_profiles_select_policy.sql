-- Re-habilita RLS para garantir que a segurança está ativa
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove qualquer versão anterior da política de SELECT
DROP POLICY IF EXISTS "Usuários veem o próprio perfil" ON public.profiles;

-- Cria a política de SELECT permitindo que o usuário leia seu próprio perfil, sem restringir a TO authenticated
CREATE POLICY "Usuários veem o próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
