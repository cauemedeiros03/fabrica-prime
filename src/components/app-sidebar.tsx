import { Link, useLocation, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  KanbanSquare,
  Wallet,
  Calendar,
  Users,
  Settings,
  Hammer,
  Sparkles,
  Truck,
  Factory,
  AlertTriangle,
  Clock,
  CalendarClock,
  FileText,
  LogOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Reorganized categories & links matching user specifications
const categories = [
  {
    title: "Gestão Operacional",
    items: [
      { to: "/", label: "Painel", icon: LayoutDashboard },
      { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
      { to: "/orcamentos", label: "Orçamentos", icon: FileText },
      { to: "/producao", label: "Produção", icon: KanbanSquare },
      { to: "/agenda", label: "Agenda", icon: Calendar },
    ],
  },
  {
    title: "Logística e Vendas",
    items: [
      { to: "/clientes", label: "Clientes", icon: Users },
      { to: "/entregas", label: "Entregas", icon: Truck },
    ],
  },
  {
    title: "Administrativo",
    items: [
      { to: "/financeiro", label: "Financeiro", icon: Wallet },
    ],
  },
  {
    title: "Acesso Rápido",
    isShortcut: true,
    items: [
      { to: "/pedidos", search: { filtro: "em-producao" }, label: "Em produção", icon: Factory, key: "em-producao" },
      { to: "/pedidos", search: { filtro: "atrasados" }, label: "Atrasados", icon: AlertTriangle, key: "atrasados" },
      { to: "/financeiro", search: { filtro: "pendentes" }, label: "Pagamentos pendentes", icon: Clock, key: "pendentes" },
      { to: "/entregas", search: {}, label: "Próximas entregas", icon: CalendarClock, key: "entregas" },
    ],
  },
  {
    title: "Suporte & Ajustes",
    items: [
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const search = useRouterState({ select: (s) => s.location.search as Record<string, string> });
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  console.log("Dados do Perfil na Sidebar:", profile);

  const status = profile?.status_assinatura;
  const trialEndsAt = profile?.trial_ends_at;

  const getTrialTimeRemaining = () => {
    let endTimeStr = trialEndsAt;
    if (!endTimeStr && profile?.created_at) {
      const createdDate = new Date(profile.created_at);
      createdDate.setDate(createdDate.getDate() + 7);
      endTimeStr = createdDate.toISOString();
    }
    
    if (!endTimeStr) {
      const defaultEnd = new Date();
      defaultEnd.setDate(defaultEnd.getDate() + 7);
      endTimeStr = defaultEnd.toISOString();
    }

    const end = new Date(endTimeStr).getTime();
    const now = new Date().getTime();
    const diffTime = end - now;
    if (diffTime <= 0) return { days: 0, hours: 0, percentage: 0 };

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    const totalDuration = 7 * 24 * 60 * 60 * 1000;
    const percentage = Math.max(0, Math.min(100, (diffTime / totalDuration) * 100));

    return { days: diffDays, hours: diffHours, percentage };
  };

  const { days: dias, hours: horas, percentage: pct } = getTrialTimeRemaining();
  const isAtivo = status === "ativo" || status === "active";
  const showTrialCard = !isAtivo;
  const CAKTO_CHECKOUT_URL = import.meta.env.VITE_CAKTO_PLAN_ID || "https://pay.cakto.com.br/63vqari_895705";
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [nomeMarcenaria, setNomeMarcenaria] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from("configuracoes_marcenaria")
          .select("logo_url, nome_marcenaria")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data) {
          setLogoUrl(data.logo_url || null);
          setNomeMarcenaria(data.nome_marcenaria || null);
        }
      } catch (err) {
        console.error("Erro ao carregar logo na sidebar:", err);
      }
    }

    loadConfig();

    const handleUpdate = () => {
      loadConfig();
    };

    window.addEventListener("configuracoes_updated", handleUpdate);
    return () => {
      window.removeEventListener("configuracoes_updated", handleUpdate);
    };
  }, [user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/login" });
  };

  const userName = profile?.nome || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuário";
  const userEmail = user?.email || "";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  
  const getInitials = () => {
    if (profile?.nome) {
      const parts = profile.nome.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return profile.nome.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "US";
  };
  const initials = getInitials();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground h-screen sticky top-0">
      {/* Top Header */}
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-sidebar-border shrink-0">
        {logoUrl ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl border bg-background grid place-items-center overflow-hidden shrink-0">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="font-semibold tracking-tight truncate">{nomeMarcenaria || "Sua bancada"}</p>
              <p className="text-[11px] text-muted-foreground truncate">Gestão da sua marcenaria</p>
            </div>
          </div>
        ) : (
          <>
            <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-[var(--shadow-glow)]">
              <Hammer className="size-4.5" strokeWidth={2.4} />
            </div>
            <div className="leading-tight">
              <p className="font-semibold tracking-tight">{nomeMarcenaria || "Sua bancada"}</p>
              <p className="text-[11px] text-muted-foreground">Gestão da sua marcenaria</p>
            </div>
          </>
        )}
      </div>

      {/* Categories & Links (Scrollable area) */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {categories.map((category) => (
          <div key={category.title} className="space-y-1.5">
            <h3 className="text-xs font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase px-2.5 mb-2">
              {category.title}
            </h3>
            <div className="space-y-1">
              {category.items.map((item) => {
                const isShortcut = category.isShortcut;
                const itemWithSearch = item as { to: string; search?: Record<string, string>; label: string; icon: any };
                let active = false;
                
                if (isShortcut) {
                  const filtroAlvo = itemWithSearch.search?.filtro;
                  active = pathname === item.to && search?.filtro === filtroAlvo;
                } else {
                  active = pathname === item.to && !search?.filtro && !search?.etapa;
                }

                const Icon = item.icon;
                const linkKey = isShortcut ? (item as any).key : item.to;

                return (
                  <Link
                    key={linkKey}
                    to={item.to}
                    search={isShortcut ? (itemWithSearch.search || {}) : {}}
                    className={
                      active
                        ? isShortcut
                          ? "bg-primary/8 text-primary font-medium text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors"
                          : "bg-primary/10 text-primary font-semibold text-sm px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition-colors"
                        : isShortcut
                          ? "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors"
                          : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 text-sm px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition-colors"
                    }
                  >
                    <Icon className={isShortcut ? "size-3.5 shrink-0" : "size-4 shrink-0"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {showTrialCard && (
          <div className="rounded-xl border border-sidebar-border bg-gradient-to-br from-sidebar-accent to-sidebar p-4 animate-in fade-in duration-200 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-4 text-primary" />
              <p className="text-sm font-medium">Período de Teste</p>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Clock className="size-3.5 text-primary animate-pulse shrink-0" />
              <span>Restam {dias} {dias === 1 ? "dia" : "dias"} e {horas} {horas === 1 ? "hora" : "horas"}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-1 mb-4 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-500" 
                style={{ width: `${pct}%` }}
              />
            </div>

            <a
              href={CAKTO_CHECKOUT_URL}
              className="w-full inline-flex items-center justify-center rounded-md bg-success text-success-foreground text-xs font-medium py-2 hover:opacity-90 transition shadow-sm text-center font-semibold"
            >
              Ativar Conta
            </a>
          </div>
        )}
      </nav>

      {/* User Profile Card (Fixed footer) */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar shrink-0 flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={userName}
            className="size-9 rounded-full object-cover border border-sidebar-border shrink-0"
          />
        ) : (
          <div className="size-9 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0 border border-primary/20">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-sidebar-foreground truncate leading-none" title={userName}>
            {userName}
          </p>
          <p className="text-xs text-gray-400 truncate mt-1 leading-none" title={userEmail}>
            {userEmail}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          title="Sair"
          aria-label="Sair"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
