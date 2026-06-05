import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { NovoPedidoDialog } from "./novo-pedido-dialog";
import { OrcamentoDialog } from "@/components/orcamento-dialog";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Loader2, X, Menu, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [nomeMarcenaria, setNomeMarcenaria] = useState<string | null>(null);
  useRealtimeSync();
  const pathname = location.pathname;
  const showMobileActions = pathname === "/" || pathname === "/pedidos";

  useEffect(() => {
    async function loadConfig() {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("configuracoes_marcenaria")
          .select("nome_marcenaria")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          setNomeMarcenaria(data.nome_marcenaria || null);
        }
      } catch (err) {
        console.error("Erro ao carregar nome marcenaria:", err);
      }
    }
    loadConfig();
  }, [user?.id]);

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
      if (!user || !user.email_confirmed_at) {
        navigate({ to: "/login" });
      } else if (!hasAccess) {
        navigate({ to: "/assinatura" });
      }
    }
  }, [user?.id, user?.email_confirmed_at, hasAccess, loading, navigate]);

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
  // Se não houver usuário, e-mail não confirmado ou o acesso for negado, escondemos o shell.
  if (!user || !user.email_confirmed_at || !hasAccess) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar 
        onNovoPedido={() => setNovoPedido(true)} 
        onNovoOrcamento={() => setNovoOrcamento(true)} 
      />

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <div className="absolute inset-y-0 left-0 w-[80vw] max-w-[320px] bg-sidebar shadow-2xl animate-in slide-in-from-left flex flex-col h-full border-r">
            <div className="h-14 flex items-center justify-between px-4 border-b shrink-0 bg-sidebar">
              <span className="font-bold text-sm truncate">{nomeMarcenaria || "Menu"}</span>
              <button
                onClick={() => setMobileNav(false)}
                className="size-9 grid place-items-center rounded-lg hover:bg-sidebar-accent text-sidebar-foreground border"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto [&>aside]:!flex [&>aside]:w-full [&>aside]:h-full [&>aside]:border-0">
              <AppSidebar 
                onNovoPedido={() => {
                  setNovoPedido(true);
                  setMobileNav(false);
                }} 
                onNovoOrcamento={() => {
                  setNovoOrcamento(true);
                  setMobileNav(false);
                }} 
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Navbar */}
        <div className="lg:hidden h-14 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNav(true)}
              className="size-9 grid place-items-center rounded-lg border hover:bg-accent transition shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>
            <span className="font-bold text-sm tracking-tight truncate">
              {nomeMarcenaria || "Sua bancada"}
            </span>
          </div>
        </div>

        <AppHeader
          title={title}
          subtitle={subtitle}
          onNovoPedido={() => setNovoPedido(true)}
          onNovoOrcamento={() => setNovoOrcamento(true)}
          onOpenNav={() => setMobileNav(true)}
        />
        <main className="flex-1 p-6 pt-20 lg:pt-8 lg:p-8 animate-in fade-in duration-200">
          {/* Mobile-only page header & quick actions */}
          <div className="lg:hidden mb-5">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            
            {/* Quick Actions Bar */}
            {showMobileActions && (
              <div className="flex flex-row gap-2 w-full mt-4">
                <button
                  onClick={() => setNovoPedido(true)}
                  className="flex-grow h-10 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-[var(--shadow-glow)] cursor-pointer"
                >
                  <Plus className="size-4 shrink-0" />
                  <span>Novo pedido</span>
                </button>
                <button
                  onClick={() => setNovoOrcamento(true)}
                  className="flex-grow h-10 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <FileText className="size-4 shrink-0" />
                  <span>Gerar Orçamento</span>
                </button>
              </div>
            )}
          </div>

          {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
          {children}
        </main>
      </div>
      <NovoPedidoDialog open={novoPedido} onOpenChange={setNovoPedido} />
      <OrcamentoDialog open={novoOrcamento} onOpenChange={setNovoOrcamento} />
    </div>
  );
}
