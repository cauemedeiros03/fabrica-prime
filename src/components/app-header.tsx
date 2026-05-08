import { Search, Bell, Plus, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="h-16 border-b bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center gap-4 px-6">
      <div className="min-w-0">
        <h1 className="text-base font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar pedido, cliente, produto…"
            className="w-72 h-9 pl-9 pr-3 rounded-lg border bg-card text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30 transition"
          />
        </div>

        <button
          onClick={() => setDark((v) => !v)}
          className="size-9 grid place-items-center rounded-lg border hover:bg-accent transition"
          aria-label="Alternar tema"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        <button className="size-9 grid place-items-center rounded-lg border hover:bg-accent transition relative">
          <Bell className="size-4" />
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-destructive" />
        </button>

        <button className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-glow)]">
          <Plus className="size-4" />
          Novo pedido
        </button>

        <div className="size-9 rounded-full bg-gradient-to-br from-primary/80 to-primary grid place-items-center text-primary-foreground text-xs font-semibold ml-1">
          AM
        </div>
      </div>
    </header>
  );
}
