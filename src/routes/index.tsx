import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { ETAPAS, moeda, dataBR, type StatusEtapa } from "@/lib/mock-data";
import { usePedidos } from "@/hooks/use-pedidos";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
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
      { title: "Painel · Sua bancada — Gestão de Marcenaria" },
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
  to,
  search,
}: {
  label: string;
  valor: string;
  delta?: string;
  icon: React.ComponentType<{ className?: string }>;
  positivo?: boolean;
  to?: string;
  search?: Record<string, string>;
}) {
  const content = (
    <>
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
          {delta} <span className="text-muted-foreground">vs período anterior</span>
        </div>
      )}
    </>
  );
  const cls =
    "block text-left rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 hover:border-primary/40 transition cursor-pointer";
  if (to) {
    return (
      <Link to={to} search={search ?? {}} className={cls}>
        {content}
      </Link>
    );
  }
  return <div className={cls}>{content}</div>;
}

type Periodo = "7d" | "30d" | "12m";

function aggregate(pedidos: { valorTotal: number; criadoEm: string }[], periodo: Periodo) {
  const now = new Date();
  if (periodo === "7d") {
    const buckets: { label: string; receita: number; key: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.push({
        key,
        label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        receita: 0,
      });
    }
    pedidos.forEach((p) => {
      const k = String(p.criadoEm).slice(0, 10);
      const b = buckets.find((x) => x.key === k);
      if (b) b.receita += Number(p.valorTotal);
    });
    return buckets.map(({ label, receita }) => ({ mes: label, receita }));
  }
  if (periodo === "30d") {
    const buckets: { label: string; receita: number; start: number; end: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      buckets.push({
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        receita: 0,
        start: +new Date(start.toDateString()),
        end: +new Date(end.toDateString()) + 86400000,
      });
    }
    pedidos.forEach((p) => {
      const t = +new Date(p.criadoEm);
      const b = buckets.find((x) => t >= x.start && t < x.end);
      if (b) b.receita += Number(p.valorTotal);
    });
    return buckets.map(({ label, receita }) => ({ mes: label, receita }));
  }
  // 12m
  const buckets: { label: string; receita: number; key: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      receita: 0,
    });
  }
  pedidos.forEach((p) => {
    const d = new Date(p.criadoEm);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.find((x) => x.key === k);
    if (b) b.receita += Number(p.valorTotal);
  });
  return buckets.map(({ label, receita }) => ({ mes: label, receita }));
}

function PainelPage() {
  const { data: PEDIDOS = [], isLoading: lp, error: ep } = usePedidos();
  const [periodo, setPeriodo] = useState<Periodo>("12m");
  const navigate = useNavigate();
  const isLoading = lp;

  // Efeitos para expor quaisquer erros de requisição no console
  useEffect(() => {
    if (ep) {
      console.error("Erro ao buscar pedidos no Painel:", ep);
    }
  }, [ep]);

  const pedidosAtivos = useMemo(() => {
    return PEDIDOS.filter((p) => {
      const etapaLower = String(p.etapa || "").toLowerCase();
      return !(
        etapaLower === "cancelado" ||
        etapaLower === "cancelada" ||
        etapaLower === "excluido" ||
        etapaLower === "excluído" ||
        p.excluido === true ||
        p.deleted === true ||
        p.ativo === false
      );
    });
  }, [PEDIDOS]);

  const emProducao = pedidosAtivos.filter((p) => !["entregue", "pronto-entrega"].includes(String(p.etapa).toLowerCase()));
  const atrasados = pedidosAtivos.filter((p) => new Date(p.entrega) < new Date() && String(p.etapa).toLowerCase() !== "entregue");
  const concluidos = pedidosAtivos.filter((p) => String(p.etapa).toLowerCase() === "entregue");
  const receitaTotal = pedidosAtivos.reduce((s, p) => s + p.valorTotal, 0);
  const recebidoTotal = pedidosAtivos.reduce((s, p) => s + p.valorPago, 0);
  const aReceber = receitaTotal - recebidoTotal;

  // Filtrar os pedidos para incluir apenas os status válidos
  const chartPedidos = useMemo(() => {
    return pedidosAtivos.filter((p) => {
      const status = String(p.etapa || "").toLowerCase();
      return (
        status === "entregue" ||
        status === "pago" ||
        status === "concluido" ||
        status === "concluído" ||
        status === "finalizado"
      );
    });
  }, [pedidosAtivos]);

  const chartData = useMemo(() => aggregate(chartPedidos, periodo), [chartPedidos, periodo]);
  const receitaPeriodo = chartData.reduce((s, x) => s + x.receita, 0);

  const etapasAgg = ETAPAS.map((e) => ({
    id: e.id,
    nome: e.label.split(" ")[0],
    qtd: pedidosAtivos.filter((p) => String(p.etapa).toLowerCase() === String(e.id).toLowerCase()).length,
  }));

  const proximas = [...pedidosAtivos]
    .filter((p) => String(p.etapa).toLowerCase() !== "entregue")
    .sort((a, b) => +new Date(a.entrega) - +new Date(b.entrega))
    .slice(0, 5);

  return (
    <AppShell title="Painel geral" subtitle="Visão completa da sua produção e finanças">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Em produção" valor={`${emProducao.length} pedidos`} icon={Package} to="/pedidos" search={{ filtro: "em-producao" }} />
        <Stat label="Atrasados" valor={`${atrasados.length}`} icon={AlertTriangle} to="/pedidos" search={{ filtro: "atrasados" }} />
        <Stat label="Entregues" valor={`${concluidos.length}`} icon={CheckCircle2} to="/pedidos" search={{ filtro: "entregues" }} />
        <Stat label="A receber" valor={moeda(aReceber)} icon={Clock} to="/financeiro" search={{ filtro: "pendentes" }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Receita {periodo === "7d" ? "(últimos 7 dias)" : periodo === "30d" ? "(últimas 5 semanas)" : "(últimos 12 meses)"}
              </p>
              <p className="text-2xl font-semibold tracking-tight">{moeda(receitaPeriodo)}</p>
              <p className="text-xs text-success inline-flex items-center gap-1 mt-1">
                <TrendingUp className="size-3.5" /> {chartPedidos.length} pedido(s) faturado(s)
              </p>
            </div>
            <div className="flex gap-1 text-xs">
              {(["7d", "30d", "12m"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    periodo === p ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/60"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 relative">
            {isLoading && (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -12, right: 8, top: 8 }}>
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
                  isAnimationActive
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <p className="text-sm text-muted-foreground">Pedidos por etapa</p>
          <p className="text-2xl font-semibold tracking-tight">{PEDIDOS.length}</p>
          <p className="text-xs text-muted-foreground mb-3">Clique em uma etapa para filtrar</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={etapasAgg} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="nome" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-accent)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="qtd"
                  fill="var(--color-primary)"
                  radius={[6, 6, 0, 0]}
                  className="cursor-pointer"
                  onClick={(d: { id?: string }) => d?.id && navigate({ to: "/pedidos", search: { etapa: d.id as StatusEtapa } })}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {etapasAgg.map((e) => (
              <Link
                key={e.id}
                to="/pedidos"
                search={{ etapa: e.id }}
                className="text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-accent transition"
              >
                {e.nome} <span className="text-muted-foreground">·{e.qtd}</span>
              </Link>
            ))}
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
            <Link to="/entregas" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y">
            {proximas.length === 0 && (
              <div className="px-5 py-10 text-sm text-muted-foreground text-center">Nenhuma entrega agendada.</div>
            )}
            {proximas.map((p) => {
              const atrasado = new Date(p.entrega) < new Date();
              const etapa = ETAPAS.find((e) => e.id === p.etapa)!;
              return (
                <Link
                  to="/entregas"
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-accent/40 transition"
                >
                  <div
                    className="size-10 rounded-lg grid place-items-center text-xs font-semibold"
                    style={{ backgroundColor: `color-mix(in oklab, ${etapa.cor} 18%, transparent)`, color: etapa.cor }}
                  >
                    {p.numero.replace("#", "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.produto}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.cliente} · {p.cidade}</p>
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
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <p className="font-semibold tracking-tight">Resumo financeiro</p>
          <p className="text-xs text-muted-foreground mb-4">Acumulado real</p>

          {[
            { l: "Recebido", v: recebidoTotal, c: "success" },
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
                  style={{ width: `${receitaTotal ? Math.min(100, (row.v / receitaTotal) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
