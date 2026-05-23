import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { NovoPedidoDialog } from "./novo-pedido-dialog";
import { OrcamentoDialog } from "@/components/orcamento-dialog";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

export function AppShell({
  title,
  subtitle,
  breadcrumbs,
  children,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  children: ReactNode;
}) {
  const { user, profile, subscription, loading } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [novoPedido, setNovoPedido] = useState(false);
  const [novoOrcamento, setNovoOrcamento] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  useRealtimeSync();

  // Paywall bypass checks (matches __root.tsx logic)
  const isAdmin = user?.email === "admin@marcena.com.br";
  
  // Direct bypass if active
  const status = profile?.status_assinatura;
  const trialEndsAt = (profile as any)?.trial_ends_at;
  const isTrialValid = status === "trial" && trialEndsAt && new Date(trialEndsAt) > new Date();
  const isSubActiveFromProfile = status === "ativo" || status === "active" || isTrialValid;
  const hasActiveSub = subscription?.status === "active" || isSubActiveFromProfile;
  const hasAccess = !!(isAdmin || hasActiveSub);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate({ to: "/login" });
      } else if (!hasAccess) {
        navigate({ to: "/assinatura" });
      }
    }
  }, [user?.id, hasAccess, loading, navigate]);

  // scroll-to-top on route change
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, left: 0 });
    setMobileNav(false);
  }, [location.pathname]);

  // Alerta de boas-vindas para primeiro login / cadastro recente
  useEffect(() => {
    if (user && profile && typeof window !== "undefined") {
      const isFirstLogin = localStorage.getItem("suabancada_first_login") === "true";
      const hasShownWelcome = localStorage.getItem("suabancada_welcome_shown") === "true";
      
      const createdTime = profile.created_at ? new Date(profile.created_at).getTime() : 0;
      const isRecentlyCreated = createdTime && (new Date().getTime() - createdTime < 1000 * 60 * 10); // 10 minutos
      
      if ((isFirstLogin || isRecentlyCreated) && !hasShownWelcome) {
        toast.success("Bem-vindo ao Sua bancada! Seu período de 7 dias de teste grátis começou.", {
          duration: 8000,
        });
        localStorage.setItem("suabancada_welcome_shown", "true");
        localStorage.removeItem("suabancada_first_login");
      }
    }
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Previne o "flash" da interface interna enquanto o useEffect faz o redirecionamento
  // Se não houver usuário ou o acesso for negado, escondemos o shell.
  if (!user || !hasAccess) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-2xl animate-in slide-in-from-left">
            <button
              onClick={() => setMobileNav(false)}
              className="absolute right-3 top-3 size-8 grid place-items-center rounded-lg hover:bg-sidebar-accent z-10"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
            <div className="block lg:hidden h-full [&>aside]:!flex [&>aside]:w-full">
              <AppSidebar />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          title={title}
          subtitle={subtitle}
          onNovoPedido={() => setNovoPedido(true)}
          onNovoOrcamento={() => setNovoOrcamento(true)}
          onOpenNav={() => setMobileNav(true)}
        />
        <main className="flex-1 p-6 lg:p-8 animate-in fade-in duration-200">
          {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
          {children}
        </main>
      </div>
      <NovoPedidoDialog open={novoPedido} onOpenChange={setNovoPedido} />
      <OrcamentoDialog open={novoOrcamento} onOpenChange={setNovoOrcamento} />
    </div>
  );
}
