import { Link, useRouter } from "@tanstack/react-router";
import { ChevronRight, ArrowLeft, Home } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items, showBack = true }: { items: Crumb[]; showBack?: boolean }) {
  const router = useRouter();
  const canGoBack = typeof window !== "undefined" && window.history.length > 1;

  return (
    <div className="flex items-center gap-2 mb-4 text-sm">
      {showBack && canGoBack && (
        <button
          onClick={() => router.history.back()}
          className="size-8 grid place-items-center rounded-lg border bg-card hover:bg-accent transition shrink-0"
          aria-label="Voltar"
          title="Voltar"
        >
          <ArrowLeft className="size-4" />
        </button>
      )}
      <nav className="flex items-center gap-1 text-muted-foreground min-w-0 overflow-hidden">
        <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground transition shrink-0">
          <Home className="size-3.5" /> Painel
        </Link>
        {items.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1 min-w-0">
            <ChevronRight className="size-3.5 shrink-0 opacity-60" />
            {c.to && i < items.length - 1 ? (
              <Link to={c.to} className="hover:text-foreground transition truncate">
                {c.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium truncate">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}
