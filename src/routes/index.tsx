import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RECEITA_MENSAL, ETAPAS, moeda, dataBR } from "@/lib/mock-data";
import { usePedidos } from "@/hooks/use-pedidos";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

export const Route = createFileRoute("/")({
  component: PainelPage,
  head: () => ({
    meta: [
      { title: "Painel · Marcena — Gestão para Marcenarias" },
      {
        name: "description",
        content:
          "Acompanhe pedidos, produção, prazos e finanças da sua marcenaria em um só painel.",
      },
    ],
  }),
});

function Stat({
  label,
  valor,
  delta,
  icon: Icon,
  positivo,
}: {
  label: string;
  valor: string;
  delta?: string;
  icon: React.ComponentType<{ className?: string }>;
  positivo?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] transition">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="size-8 grid place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{valor}</p>
      {delta && (
        <div
          className={`mt-1 inline-flex items-center gap-1 text-xs ${
            positivo ? "text-success" : "text-destructive"
          }`}
        >
          {positivo ? (
            <ArrowUpRight className="size-3.5" />
          ) : (
            <ArrowDownRight className="size-3.5" />
          )}
          {delta} <span className="text-muted-foreground">vs mês anterior</span>
        </div>
      )}
    </div>
  );
}

function PainelPage() {
  const { data: PEDIDOS = [] } = usePedidos();
  const emProducao = PEDIDOS.filter(
    (p) => !["entregue", "pronto-entrega"].includes(p.etapa),
  );
  const atrasados = PEDIDOS.filter(
    (p) => new Date(p.entrega) < new Date() && p.etapa !== "entregue",
  );
  const concluidos = PEDIDOS.filter((p) => p.etapa === "entregue");
  const receitaTotal = PEDIDOS.reduce((s, p) => s + p.valorTotal, 0);
  const aReceber = PEDIDOS.reduce((s, p) => s + (p.valorTotal - p.valorPago), 0);

  const etapasAgg = ETAPAS.map((e) => ({
    nome: e.label.split(" ")[0],
    qtd: PEDIDOS.filter((p) => p.etapa === e.id).length,
  }));

  const proximas = [...PEDIDOS]
    .filter((p) => p.etapa !== "entregue")
    .sort((a, b) => +new Date(a.entrega) - +new Date(b.entrega))
    .slice(0, 5);

  return (
    <AppShell
      title="Painel geral"
      subtitle="Visão completa da sua produção e finanças"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Em produção" valor={`${emProducao.length} pedidos`} icon={Package} delta="+12%" positivo />
        <Stat label="Atrasados" valor={`${atrasados.length}`} icon={AlertTriangle} delta="-1" positivo />
        <Stat label="Entregues no mês" valor={`${concluidos.length}`} icon={CheckCircle2} delta="+8%" positivo />
        <Stat label="A receber" valor={moeda(aReceber)} icon={Clock} delta="+R$ 12.4k" positivo />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Receita</p>
              <p className="text-2xl font-semibold tracking-tight">
                {moeda(receitaTotal)}
              </p>
              <p className="text-xs text-success inline-flex items-center gap-1 mt-1">
                <TrendingUp className="size-3.5" /> +18,2% últimos 7 meses
              </p>
            </div>
            <div className="flex gap-1 text-xs">
              {["7d", "30d", "12m"].map((p, i) => (
                <button
                  key={p}
                  className={`px-2.5 py-1 rounded-md ${
                    i === 2 ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/60"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={RECEITA_MENSAL} margin={{ left: -12, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => moeda(v)}
                />
                <Area
                  type="monotone"
                  dataKey="receita"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill="url(#gReceita)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <p className="text-sm text-muted-foreground">Pedidos por etapa</p>
          <p className="text-2xl font-semibold tracking-tight">{PEDIDOS.length}</p>
          <p className="text-xs text-muted-foreground mb-3">distribuição atual</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={etapasAgg} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="nome" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="qtd" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 rounded-2xl border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="p-5 pb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold tracking-tight">Próximas entregas</p>
              <p className="text-xs text-muted-foreground">Ordenado por urgência</p>
            </div>
            <button className="text-xs text-primary hover:underline">Ver todos</button>
          </div>
          <div className="divide-y">
            {proximas.map((p) => {
              const atrasado = new Date(p.entrega) < new Date();
              const etapa = ETAPAS.find((e) => e.id === p.etapa)!;
              return (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/40 transition">
                  <div
                    className="size-10 rounded-lg grid place-items-center text-xs font-semibold"
                    style={{ backgroundColor: `color-mix(in oklab, ${etapa.cor} 18%, transparent)`, color: etapa.cor }}
                  >
                    {p.numero.replace("#", "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.produto}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.cliente} · {p.cidade}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `color-mix(in oklab, ${etapa.cor} 14%, transparent)`, color: etapa.cor }}
                    >
                      {etapa.label}
                    </span>
                  </div>
                  <div className={`text-xs font-medium tabular-nums ${atrasado ? "text-destructive" : "text-foreground"}`}>
                    {dataBR(p.entrega)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <p className="font-semibold tracking-tight">Resumo financeiro</p>
          <p className="text-xs text-muted-foreground mb-4">Mês atual</p>

          {[
            { l: "Recebido", v: PEDIDOS.reduce((s, p) => s + p.valorPago, 0), c: "success" },
            { l: "A receber", v: aReceber, c: "warning" },
            { l: "Total faturado", v: receitaTotal, c: "info" },
          ].map((row) => (
            <div key={row.l} className="py-3 border-b last:border-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.l}</span>
                <span className="font-semibold tabular-nums">{moeda(row.v)}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full bg-${row.c}`}
                  style={{ width: `${Math.min(100, (row.v / receitaTotal) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
