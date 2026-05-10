import { Plus, Moon, Sun, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { GlobalSearch } from "./global-search";
import { NotificationsPanel } from "./notifications-panel";

export function AppHeader({ title, subtitle, onNovoPedido }: { title: string; subtitle?: string; onNovoPedido?: () => void }) {
  const [dark, setDark] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const inic = (user?.email ?? "U").slice(0, 2).toUpperCase();

  const sair = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/login" });
  };

  return (
    <header className="h-16 border-b bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center gap-4 px-6">
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

        <button
          onClick={onNovoPedido}
          className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-glow)]"
        >
          <Plus className="size-4" />
          Novo pedido
        </button>

        <button
          onClick={sair}
          className="size-9 grid place-items-center rounded-lg border hover:bg-accent transition"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="size-4" />
        </button>

        <div className="size-9 rounded-full bg-gradient-to-br from-primary/80 to-primary grid place-items-center text-primary-foreground text-xs font-semibold ml-1">
          {inic}
        </div>
      </div>
    </header>
  );
}
