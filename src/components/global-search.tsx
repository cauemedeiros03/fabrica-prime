import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { usePedidos } from "@/hooks/use-pedidos";
import { ETAPAS } from "@/lib/mock-data";

function highlight(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-primary/20 text-foreground rounded-sm px-0.5">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: pedidos = [], isLoading } = usePedidos();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo(() => {
    if (!debounced) return [];
    const ql = debounced.toLowerCase();
    return pedidos
      .filter((p) => {
        const etapa = ETAPAS.find((e) => e.id === p.etapa)?.label ?? "";
        return [p.cliente, p.produto, p.numero, p.tipo, p.telefone, etapa]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(ql));
      })
      .slice(0, 8);
  }, [debounced, pedidos]);

  return (
    <div ref={ref} className="relative hidden md:block">
      <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar pedido, cliente, produto…"
        className="w-72 h-9 pl-9 pr-3 rounded-lg border bg-card text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30 transition"
      />
      {open && debounced && (
        <div className="absolute top-11 left-0 w-[26rem] max-w-[90vw] rounded-xl border bg-popover shadow-[var(--shadow-elevated)] z-50 overflow-hidden">
          {isLoading && (
            <div className="px-4 py-6 text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Buscando…
            </div>
          )}
          {!isLoading && results.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground">Nenhum resultado para "{debounced}".</div>
          )}
          {results.length > 0 && (
            <ul className="max-h-96 overflow-auto py-1">
              {results.map((p) => {
                const etapa = ETAPAS.find((e) => e.id === p.etapa)!;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        navigate({ to: "/pedidos" });
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-accent transition flex items-center gap-3"
                    >
                      <div
                        className="size-9 rounded-lg grid place-items-center text-[11px] font-semibold shrink-0"
                        style={{ backgroundColor: `color-mix(in oklab, ${etapa.cor} 18%, transparent)`, color: etapa.cor }}
                      >
                        {p.numero.replace("#", "")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{highlight(p.produto, debounced)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {highlight(p.cliente, debounced)} · {highlight(p.telefone || p.cidade || "", debounced)}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: `color-mix(in oklab, ${etapa.cor} 14%, transparent)`, color: etapa.cor }}
                      >
                        {etapa.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
