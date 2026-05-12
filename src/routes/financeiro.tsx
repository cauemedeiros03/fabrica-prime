import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RECEITA_MENSAL, moeda, dataBR } from "@/lib/mock-data";
import { usePedidos } from "@/hooks/use-pedidos";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/financeiro")({
  component: FinanceiroPage,
  head: () => ({ meta: [{ title: "Financeiro · Marcena" }] }),
  validateSearch: (s: Record<string, unknown>): { filtro?: "pendentes" } => ({
    filtro: s.filtro === "pendentes" ? "pendentes" : undefined,
  }),
});

function FinanceiroPage() {
  const { filtro } = Route.useSearch();
  const { data: PEDIDOS = [] } = usePedidos();
  const recebido = PEDIDOS.reduce((s, p) => s + p.valorPago, 0);
  const aReceber = PEDIDOS.reduce((s, p) => s + (p.valorTotal - p.valorPago), 0);
  const faturado = recebido + aReceber;
  const pendentes = PEDIDOS.filter((p) => p.valorPago < p.valorTotal);

  return (
    <AppShell title="Financeiro" subtitle={filtro === "pendentes" ? `${pendentes.length} pagamentos pendentes` : "Controle completo de receitas e recebíveis"}>
      {filtro === "pendentes" && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border bg-accent/30 px-3 py-2 text-sm">
          <Clock className="size-4 text-warning-foreground" />
          <span>Filtro ativo:</span>
          <span className="font-medium">Pagamentos pendentes</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { l: "Recebido", v: recebido, i: CheckCircle2, c: "text-success", bg: "bg-success/10" },
          { l: "A receber", v: aReceber, i: Clock, c: "text-warning-foreground", bg: "bg-warning/20" },
          { l: "Total faturado", v: faturado, i: AlertCircle, c: "text-info", bg: "bg-info/10" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.l}</p>
              <div className={`size-9 grid place-items-center rounded-lg ${s.bg} ${s.c}`}>
                <s.i className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{moeda(s.v)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] mt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold tracking-tight">Receita vs custos</p>
            <p className="text-xs text-muted-foreground">Últimos 7 meses</p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={RECEITA_MENSAL} margin={{ left: -10, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => moeda(v)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receita" name="Receita" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="custo" name="Custo" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border bg-card mt-4 shadow-[var(--shadow-soft)] overflow-hidden">
        <div className="p-5 pb-3">
          <p className="font-semibold tracking-tight">Pagamentos pendentes</p>
          <p className="text-xs text-muted-foreground">{pendentes.length} pedidos com saldo em aberto</p>
        </div>
        <div className="divide-y">
          {pendentes.map((p) => {
            const restante = p.valorTotal - p.valorPago;
            const pct = (p.valorPago / p.valorTotal) * 100;
            return (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {p.cliente} <span className="text-muted-foreground font-normal">— {p.numero}</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{p.produto}</p>
                </div>
                <div className="hidden md:block w-40">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>Pago</span>
                    <span className="tabular-nums">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{moeda(restante)}</p>
                  <p className="text-[11px] text-muted-foreground">vence {dataBR(p.entrega)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
