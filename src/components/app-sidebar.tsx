import { Link, useLocation, useRouterState } from "@tanstack/react-router";
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
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

const nav = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/producao", label: "Produção", icon: KanbanSquare },
  { to: "/entregas", label: "Entregas", icon: Truck },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
];

const atalhos = [
  { to: "/pedidos", search: { filtro: "em-producao" }, label: "Em produção", icon: Factory, key: "em-producao" },
  { to: "/pedidos", search: { filtro: "atrasados" }, label: "Atrasados", icon: AlertTriangle, key: "atrasados" },
  { to: "/financeiro", search: { filtro: "pendentes" }, label: "Pagamentos pendentes", icon: Clock, key: "pendentes" },
  { to: "/entregas", search: {}, label: "Próximas entregas", icon: CalendarClock, key: "entregas" },
] as const;

export function AppSidebar() {
  const { pathname } = useLocation();
  const search = useRouterState({ select: (s) => s.location.search as Record<string, string> });
  const { user, profile } = useAuth();
  
  const status = profile?.status_assinatura;
  const trialEndsAt = profile?.trial_ends_at;

  const getTrialTimeRemaining = () => {
    if (!trialEndsAt) return { days: 0, hours: 0, percentage: 0 };
    const end = new Date(trialEndsAt).getTime();
    const now = new Date().getTime();
    const diffTime = end - now;
    if (diffTime <= 0) return { days: 0, hours: 0, percentage: 0 };

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    // Período total do trial é de 7 dias
    const totalDuration = 7 * 24 * 60 * 60 * 1000;
    const percentage = Math.max(0, Math.min(100, (diffTime / totalDuration) * 100));

    return { days: diffDays, hours: diffHours, percentage };
  };

  const { days: dias, hours: horas, percentage: pct } = getTrialTimeRemaining();
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

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground overflow-y-auto lg:overflow-hidden max-h-screen lg:max-h-none pb-12 lg:pb-0">
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-sidebar-border">
        {logoUrl ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl border bg-background grid place-items-center overflow-hidden shrink-0">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="font-semibold tracking-tight truncate">{nomeMarcenaria || "Sua bancada"}</p>
              <p className="text-[11px] text-muted-foreground truncate">Gestão de Marcenaria</p>
            </div>
          </div>
        ) : (
          <>
            <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-[var(--shadow-glow)]">
              <Hammer className="size-4.5" strokeWidth={2.4} />
            </div>
            <div className="leading-tight">
              <p className="font-semibold tracking-tight">{nomeMarcenaria || "Sua bancada"}</p>
              <p className="text-[11px] text-muted-foreground">Gestão de Marcenaria</p>
            </div>
          </>
        )}
      </div>

      <nav className="flex-1 lg:overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-2 pt-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Espaço de trabalho
        </p>
        {nav.map((item) => {
          const active = pathname === item.to && !search?.filtro && !search?.etapa;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              search={{}}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}

        <p className="px-2 pt-5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Acesso rápido
        </p>
        {atalhos.map((a) => {
          const Icon = a.icon;
          const filtroAlvo = (a.search as { filtro?: string }).filtro;
          const active = pathname === a.to && search?.filtro === filtroAlvo;
          return (
            <Link
              key={a.key}
              to={a.to}
              search={a.search}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
              }`}
            >
              <Icon className="size-4" />
              {a.label}
            </Link>
          );
        })}
      </nav>

      {status === "trial" && (
        <div className="m-3 rounded-xl border border-sidebar-border bg-gradient-to-br from-sidebar-accent to-sidebar p-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-4 text-primary" />
            <p className="text-sm font-medium">Período de Teste</p>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Clock className="size-3.5 text-primary animate-pulse shrink-0" />
            <span>Restam {dias} {dias === 1 ? "dia" : "dias"} e {horas} {horas === 1 ? "hora" : "horas"}</span>
          </div>

          {/* Barra de Progresso Discreta */}
          <div className="w-full bg-muted rounded-full h-1 mb-4 overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-500" 
              style={{ width: `${pct}%` }}
            />
          </div>

          <a
            href={CAKTO_CHECKOUT_URL}
            className="w-full inline-flex items-center justify-center rounded-md bg-success text-success-foreground text-xs font-medium py-2 hover:opacity-90 transition shadow-sm text-center"
          >
            Ativar Conta
          </a>
        </div>
      )}

      <Link
        to="/configuracoes"
        className="mx-3 mb-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
      >
        <Settings className="size-4" />
        Configurações
      </Link>
    </aside>
  );
}
