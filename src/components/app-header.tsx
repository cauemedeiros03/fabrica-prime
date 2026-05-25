import { Plus, Moon, Sun, Menu, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { GlobalSearch } from "./global-search";
import { NotificationsPanel } from "./notifications-panel";

export function AppHeader({
  title,
  subtitle,
  onNovoPedido,
  onNovoOrcamento,
  onOpenNav,
}: {
  title: string;
  subtitle?: string;
  onNovoPedido?: () => void;
  onNovoOrcamento?: () => void;
  onOpenNav?: () => void;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="h-16 border-b bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6">
      {onOpenNav && (
        <button
          onClick={onOpenNav}
          className="lg:hidden size-9 grid place-items-center rounded-lg border hover:bg-accent transition shrink-0"
          aria-label="Abrir menu"
        >
          <Menu className="size-4" />
        </button>
      )}
      <div className="min-w-0">
        <h1 className="text-base font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />

        <button
          onClick={() => setDark((v) => !v)}
          className="size-9 grid place-items-center rounded-lg border hover:bg-accent transition"
          aria-label="Alternar tema"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        <NotificationsPanel />

        {onNovoOrcamento && (
          <button
            onClick={onNovoOrcamento}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition shadow-[var(--shadow-soft)] shrink-0"
          >
            <FileText className="size-4" />
            <span className="hidden sm:inline">Gerar Orçamento</span>
          </button>
        )}

        {onNovoPedido && (
          <button
            onClick={onNovoPedido}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-glow)] shrink-0"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Novo pedido</span>
          </button>
        )}
      </div>
    </header>
  );
}
