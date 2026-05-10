import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { usePedidos } from "@/hooks/use-pedidos";
import { ETAPAS, dataBR, PRIORIDADE_LABEL, type StatusEtapa } from "@/lib/mock-data";
import { Loader2, AlertTriangle, MapPin, Calendar } from "lucide-react";

export const Route = createFileRoute("/entregas")({
  component: EntregasPage,
  head: () => ({ meta: [{ title: "Entregas · Marcena" }] }),
});

const PRIORIDADE_COR: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-info/15 text-info",
  alta: "bg-warning/20 text-warning-foreground",
  urgente: "bg-destructive/15 text-destructive",
};

function EntregasPage() {
  const { data: pedidos = [], isLoading } = usePedidos();
  const [etapa, setEtapa] = useState<"todas" | StatusEtapa>("todas");
  const [periodo, setPeriodo] = useState<"todas" | "atrasadas" | "semana" | "mes">("todas");

  const lista = useMemo(() => {
    const agora = Date.now();
    return pedidos
      .filter((p) => p.etapa !== "entregue")
      .filter((p) => (etapa === "todas" ? true : p.etapa === etapa))
      .filter((p) => {
        if (periodo === "todas") return true;
        const t = +new Date(p.entrega);
        if (periodo === "atrasadas") return t < agora;
        if (periodo === "semana") return t - agora >= 0 && t - agora < 1000 * 60 * 60 * 24 * 7;
        if (periodo === "mes") return t - agora >= 0 && t - agora < 1000 * 60 * 60 * 24 * 30;
        return true;
      })
      .sort((a, b) => +new Date(a.entrega) - +new Date(b.entrega));
  }, [pedidos, etapa, periodo]);

  const atrasadas = lista.filter((p) => +new Date(p.entrega) < Date.now()).length;

  return (
    <AppShell title="Entregas" subtitle={`${lista.length} entrega(s) · ${atrasadas} atrasada(s)`}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 p-1 rounded-lg bg-muted text-sm">
          {[
            { k: "todas", l: "Todas" },
            { k: "atrasadas", l: "Atrasadas" },
            { k: "semana", l: "Próx. 7 dias" },
            { k: "mes", l: "Próx. 30 dias" },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setPeriodo(f.k as never)}
              className={`px-3 py-1.5 rounded-md transition ${
                periodo === f.k ? "bg-card shadow-[var(--shadow-soft)] font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
        <select
          value={etapa}
          onChange={(e) => setEtapa(e.target.value as never)}
          className="h-10 px-3 rounded-lg border bg-card text-sm"
        >
          <option value="todas">Todas as etapas</option>
          {ETAPAS.filter((e) => e.id !== "entregue").map((e) => (
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden shadow-[var(--shadow-soft)]">
        {isLoading && (
          <div className="px-5 py-12 text-center text-muted-foreground">
            <Loader2 className="inline size-4 animate-spin mr-2" /> Carregando entregas…
          </div>
        )}
        {!isLoading && lista.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Nenhuma entrega encontrada.</div>
        )}
        <ul className="divide-y">
          {lista.map((p) => {
            const e = ETAPAS.find((x) => x.id === p.etapa)!;
            const atrasado = +new Date(p.entrega) < Date.now();
            return (
              <li key={p.id} className="px-5 py-4 flex items-center gap-4 hover:bg-accent/40 transition">
                <div
                  className="size-11 rounded-xl grid place-items-center text-xs font-semibold shrink-0"
                  style={{ backgroundColor: `color-mix(in oklab, ${e.cor} 18%, transparent)`, color: e.cor }}
                >
                  {p.numero.replace("#", "")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.produto}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.cliente} · <MapPin className="inline size-3" /> {p.cidade || "—"}
                  </p>
                </div>
                <span
                  className="hidden md:inline text-[11px] font-medium px-2 py-1 rounded-full"
                  style={{ backgroundColor: `color-mix(in oklab, ${e.cor} 14%, transparent)`, color: e.cor }}
                >
                  {e.label}
                </span>
                <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${PRIORIDADE_COR[p.prioridade]}`}>
                  {PRIORIDADE_LABEL[p.prioridade]}
                </span>
                <div className={`text-sm tabular-nums inline-flex items-center gap-1 ${atrasado ? "text-destructive font-medium" : ""}`}>
                  {atrasado ? <AlertTriangle className="size-3.5" /> : <Calendar className="size-3.5" />}
                  {dataBR(p.entrega)}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
