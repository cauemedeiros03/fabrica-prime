import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function handleCallback() {
      try {
        console.log("[Auth Callback] Processando callback de login social...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[Auth Callback] Erro ao obter sessão:", error);
          if (isMounted) navigate({ to: "/login" });
          return;
        }

        if (session) {
          console.log("[Auth Callback] Sessão detectada para o usuário:", session.user.email);
          // Definir os cookies de autenticação para o SSR
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=2592000; SameSite=Lax; Secure`;
          document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=2592000; SameSite=Lax; Secure`;
          
          if (isMounted) navigate({ to: "/" });
        } else {
          console.warn("[Auth Callback] Nenhuma sessão encontrada, redirecionando para login");
          if (isMounted) navigate({ to: "/login" });
        }
      } catch (err) {
        console.error("[Auth Callback] Erro inesperado no callback:", err);
        if (isMounted) navigate({ to: "/login" });
      }
    }

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="size-8 animate-spin text-primary mx-auto animate-infinite" />
        <p className="text-sm text-muted-foreground">Autenticando com o Google, por favor aguarde...</p>
      </div>
    </div>
  );
}
