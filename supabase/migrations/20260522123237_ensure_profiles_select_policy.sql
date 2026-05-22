-- Garante RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Garante política de SELECT sem restrição de role e com a condição auth.uid() = id
DROP POLICY IF EXISTS "Usuários veem o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários veem o próprio perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
