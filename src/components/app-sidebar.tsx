import { Link, useLocation } from "@tanstack/react-router";
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
} from "lucide-react";

const nav = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/producao", label: "Produção", icon: KanbanSquare },
  { to: "/entregas", label: "Entregas", icon: Truck },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
];

export function AppSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-sidebar-border">
        <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-[var(--shadow-glow)]">
          <Hammer className="size-4.5" strokeWidth={2.4} />
        </div>
        <div className="leading-tight">
          <p className="font-semibold tracking-tight">Marcena</p>
          <p className="text-[11px] text-muted-foreground">Gestão de Marcenaria</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-2 pt-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Espaço de trabalho
        </p>
        {nav.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
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
      </nav>

      <div className="m-3 rounded-xl border border-sidebar-border bg-gradient-to-br from-sidebar-accent to-sidebar p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="size-4 text-primary" />
          <p className="text-sm font-medium">Plano Pro</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Aproveite recursos avançados de automação e relatórios.
        </p>
        <button className="w-full rounded-md bg-primary text-primary-foreground text-xs font-medium py-2 hover:opacity-90 transition">
          Fazer upgrade
        </button>
      </div>

      <Link
        to="/"
        className="mx-3 mb-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
      >
        <Settings className="size-4" />
        Configurações
      </Link>
    </aside>
  );
}
