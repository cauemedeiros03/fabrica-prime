import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PEDIDOS, ETAPAS, moeda, dataBR, PRIORIDADE_LABEL } from "@/lib/mock-data";
import { Filter, Download, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/pedidos")({
  component: PedidosPage,
  head: () => ({ meta: [{ title: "Pedidos · Marcena" }] }),
});

const PRIORIDADE_COR: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-info/15 text-info",
  alta: "bg-warning/20 text-warning-foreground",
  urgente: "bg-destructive/15 text-destructive",
};

function PedidosPage() {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "atrasados" | "semana" | "pagamento">("todos");

  const filtrados = PEDIDOS.filter((p) => {
    const matchQ = [p.cliente, p.produto, p.numero, p.tipo, p.cidade]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase());
    if (!matchQ) return false;
    if (filtro === "atrasados") return new Date(p.entrega) < new Date() && p.etapa !== "entregue";
    if (filtro === "semana") {
      const d = +new Date(p.entrega) - +new Date();
      return d > 0 && d < 1000 * 60 * 60 * 24 * 7;
    }
    if (filtro === "pagamento") return p.valorPago < p.valorTotal;
    return true;
  });

  return (
    <AppShell title="Pedidos" subtitle={`${filtrados.length} pedidos encontrados`}>
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente, produto, cidade…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-muted text-sm">
          {[
            { k: "todos", l: "Todos" },
            { k: "atrasados", l: "Atrasados" },
            { k: "semana", l: "Esta semana" },
            { k: "pagamento", l: "Pagamento pendente" },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFiltro(f.k as never)}
              className={`px-3 py-1.5 rounded-md transition ${
                filtro === f.k ? "bg-card shadow-[var(--shadow-soft)] font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
        <button className="h-10 px-3 inline-flex items-center gap-2 rounded-lg border text-sm hover:bg-accent">
          <Filter className="size-4" /> Filtros
        </button>
        <button className="h-10 px-3 inline-flex items-center gap-2 rounded-lg border text-sm hover:bg-accent">
          <Download className="size-4" /> Exportar
        </button>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-medium px-5 py-3">Pedido</th>
                <th className="text-left font-medium px-5 py-3">Cliente</th>
                <th className="text-left font-medium px-5 py-3">Etapa</th>
                <th className="text-left font-medium px-5 py-3">Prioridade</th>
                <th className="text-right font-medium px-5 py-3">Valor</th>
                <th className="text-right font-medium px-5 py-3">Pago</th>
                <th className="text-left font-medium px-5 py-3">Entrega</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map((p) => {
                const etapa = ETAPAS.find((e) => e.id === p.etapa)!;
                const atrasado = new Date(p.entrega) < new Date() && p.etapa !== "entregue";
                const pct = (p.valorPago / p.valorTotal) * 100;
                return (
                  <tr key={p.id} className="hover:bg-accent/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{p.numero}</div>
                      <div className="text-xs text-muted-foreground">{p.produto}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>{p.cliente}</div>
                      <div className="text-xs text-muted-foreground">{p.cidade}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-[11px] font-medium px-2 py-1 rounded-full"
                        style={{ backgroundColor: `color-mix(in oklab, ${etapa.cor} 14%, transparent)`, color: etapa.cor }}
                      >
                        {etapa.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${PRIORIDADE_COR[p.prioridade]}`}>
                        {PRIORIDADE_LABEL[p.prioridade]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-medium">{moeda(p.valorTotal)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="tabular-nums text-xs text-muted-foreground">{moeda(p.valorPago)}</div>
                      <div className="mt-1 h-1 w-24 ml-auto rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className={`px-5 py-3.5 text-sm tabular-nums ${atrasado ? "text-destructive font-medium" : ""}`}>
                      {dataBR(p.entrega)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
