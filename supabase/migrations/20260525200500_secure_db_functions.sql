-- 1. Secure DB functions by locking down search_path
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.sync_pedido_cliente_nome() SET search_path = public;

-- 2. Restrict execution of SECURITY DEFINER functions from being called via the API (anon and authenticated roles)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_pedido_cliente_nome() FROM PUBLIC, anon, authenticated;
