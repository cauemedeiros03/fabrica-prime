import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { ETAPAS, moeda, dataBR, type StatusEtapa } from "@/lib/mock-data";
import { usePedidos } from "@/hooks/use-pedidos";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { NovoPedidoDialog } from "@/components/novo-pedido-dialog";
import { OrcamentoDialog } from "@/components/orcamento-dialog";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Plus,
  FileText,
  MessageCircle,
  ChevronRight,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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
  subtext,
  icon: Icon,
  badge,
  badgeVariant = "default",
  to,
  search,
}: {
  label: string;
  valor: string;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "danger";
  to?: string;
  search?: Record<string, string>;
}) {
  const badgeClasses = {
    default: "bg-muted text-muted-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    danger: "bg-destructive/15 text-destructive font-semibold",
  }[badgeVariant];

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{label}</p>
        <div className="size-8 sm:size-9 grid place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
          <Icon className="size-4 sm:size-4.5" />
        </div>
      </div>
      <p className="mt-2.5 sm:mt-3 text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate tabular-nums" title={valor}>
        {valor}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap min-h-5">
        {subtext && <span className="text-xs text-muted-foreground truncate">{subtext}</span>}
        {badge && (
          <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full ${badgeClasses} ml-auto shrink-0`}>
            {badge}
          </span>
        )}
      </div>
    </>
  );

  const cls =
    "block text-left rounded-2xl border bg-card p-4 sm:p-5 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 hover:border-primary/40 transition cursor-pointer";

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
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [openNovoPedido, setOpenNovoPedido] = useState(false);
  const [openNovoOrcamento, setOpenNovoOrcamento] = useState(false);
  const navigate = useNavigate();
  const isLoading = lp;

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
    label: e.label,
    cor: e.cor,
    qtd: pedidosAtivos.filter((p) => String(p.etapa).toLowerCase() === String(e.id).toLowerCase()).length,
  }));

  const proximas = useMemo(() => {
    return [...pedidosAtivos]
      .filter((p) => String(p.etapa).toLowerCase() !== "entregue")
      .sort((a, b) => +new Date(a.entrega) - +new Date(b.entrega))
      .slice(0, 6);
  }, [pedidosAtivos]);

  return (
    <AppShell title="Painel Geral" subtitle="Visão executiva da sua marcenaria">
      {/* ── TOP ACTION BAR (DESKTOP & MOBILE) ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-2 border-b">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Operações e Decisões de Hoje
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenNovoOrcamento(true)}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/20 active:scale-[0.98] transition cursor-pointer shadow-sm"
          >
            <FileText className="size-3.5" />
            <span>Gerar Orçamento</span>
          </button>
          <button
            onClick={() => setOpenNovoPedido(true)}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition cursor-pointer shadow-[var(--shadow-glow)]"
          >
            <Plus className="size-3.5" />
            <span>Novo Pedido</span>
          </button>
        </div>
      </div>

      {/* ── 4 PRINCIPAIS KPIS ESTRATÉGICOS ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <Stat
          label="Em Produção"
          valor={`${emProducao.length}`}
          subtext="na oficina"
          badge={emProducao.length > 0 ? "Em andamento" : "Fila vazia"}
          badgeVariant="default"
          icon={Package}
          to="/producao"
        />
        <Stat
          label="Atrasados / Atenção"
          valor={`${atrasados.length}`}
          subtext={atrasados.length === 1 ? "pedido requer ação" : "pedidos requerem ação"}
          badge={atrasados.length > 0 ? "Atrasado" : "Em dia"}
          badgeVariant={atrasados.length > 0 ? "danger" : "success"}
          icon={AlertTriangle}
          to="/pedidos"
          search={{ filtro: "atrasados" }}
        />
        <Stat
          label="A Receber"
          valor={moeda(aReceber)}
          subtext="de clientes"
          badge={aReceber > 0 ? "Saldo pendente" : "Quitado"}
          badgeVariant={aReceber > 0 ? "warning" : "success"}
          icon={Clock}
          to="/financeiro"
          search={{ filtro: "pendentes" }}
        />
        <Stat
          label="Entregues"
          valor={`${concluidos.length}`}
          subtext={`de ${pedidosAtivos.length} pedidos totais`}
          badge="Concluídos"
          badgeVariant="success"
          icon={CheckCircle2}
          to="/pedidos"
          search={{ filtro: "entregues" }}
        />
      </div>

      {/* ── PIPELINE DE ETAPAS DE PRODUÇÃO ─────────────────────────────────── */}
      <div className="mt-4 rounded-2xl border bg-card p-4 sm:p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="font-semibold text-sm tracking-tight text-foreground">Pipeline de Produção</h3>
            <p className="text-xs text-muted-foreground">Distribuição atual dos pedidos por fase da marcenaria</p>
          </div>
          <Link
            to="/producao"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <span>Ver Quadro Kanban</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {etapasAgg.map((et) => (
            <Link
              key={et.id}
              to="/producao"
              className="rounded-xl border p-2.5 sm:p-3 bg-muted/20 hover:bg-muted/50 hover:border-primary/30 transition flex flex-col justify-between text-left group"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: et.cor }}
                />
                <span className="text-xs font-bold tabular-nums text-foreground">{et.qtd}</span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground line-clamp-2 leading-tight group-hover:text-foreground transition">
                {et.label}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── RECEITA & DISTRIBUIÇÃO GRÁFICA ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Gráfico de Faturamento */}
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Receita Faturada {periodo === "7d" ? "(últimos 7 dias)" : periodo === "30d" ? "(últimas 5 semanas)" : "(últimos 12 meses)"}
              </p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums mt-1">
                {moeda(receitaPeriodo)}
              </p>
              <p className="text-xs text-success inline-flex items-center gap-1 mt-1 font-medium">
                <TrendingUp className="size-3.5" /> {chartPedidos.length} pedido(s) faturado(s)
              </p>
            </div>
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg text-xs self-start">
              {(["7d", "30d", "12m"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-3 py-1 rounded-md transition font-medium cursor-pointer ${
                    periodo === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "12 meses"}
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
              <AreaChart data={chartData} margin={{ left: -12, right: 8, top: 8, bottom: 12 }}>
                <defs>
                  <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "var(--shadow-elevated)",
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
                  animationDuration={400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resumo Financeiro & Caixa */}
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] flex flex-col justify-between">
          <div>
            <h3 className="font-semibold tracking-tight text-sm">Balanço Acumulado</h3>
            <p className="text-xs text-muted-foreground mb-4">Fluxo de pedidos contratados</p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-medium">Recebido Efetivo</span>
                  <span className="font-bold text-success tabular-nums">{moeda(recebidoTotal)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success transition-all duration-500"
                    style={{ width: `${receitaTotal ? Math.min(100, (recebidoTotal / receitaTotal) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-medium">Saldo a Receber</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{moeda(aReceber)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${receitaTotal ? Math.min(100, (aReceber / receitaTotal) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-medium">Volume Contratado</span>
                  <span className="font-bold text-foreground tabular-nums">{moeda(receitaTotal)}</span>
                </div>
                <div className="h-2 rounded-full bg-primary/20 overflow-hidden">
                  <div className="h-full rounded-full bg-primary w-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t space-y-2">
            <Link
              to="/financeiro"
              className="w-full h-9 px-3 inline-flex items-center justify-between rounded-xl border bg-muted/30 hover:bg-accent text-xs font-semibold transition"
            >
              <span>Acessar Relatório Financeiro</span>
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── PRÓXIMAS ENTREGAS & AÇÕES DIÁRIAS ──────────────────────────────── */}
      <div className="mt-4 rounded-2xl border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
        <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b">
          <div>
            <h3 className="font-semibold text-sm tracking-tight text-foreground">Próximas Entregas & Prazos Críticos</h3>
            <p className="text-xs text-muted-foreground">Pedidos ordenados pela data de entrega</p>
          </div>
          <Link to="/entregas" className="text-xs font-semibold text-primary hover:underline">
            Ver todas as entregas
          </Link>
        </div>

        <div className="divide-y">
          {proximas.length === 0 ? (
            <div className="px-5 py-10 text-sm text-muted-foreground text-center">
              Nenhuma entrega pendente no momento.
            </div>
          ) : (
            proximas.map((p) => {
              const deliveryDate = new Date(p.entrega);
              const now = new Date();
              const isPast = deliveryDate < now;
              const isToday = deliveryDate.toDateString() === now.toDateString();
              const etapa = ETAPAS.find((e) => e.id === p.etapa) || {
                id: p.etapa,
                label: p.etapa,
                cor: "var(--color-primary)",
              };

              return (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-muted/20 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="size-9 rounded-xl grid place-items-center text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${etapa.cor} 16%, transparent)`,
                        color: etapa.cor,
                      }}
                    >
                      {p.numero.replace("#", "")}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{p.produto}</p>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `color-mix(in oklab, ${etapa.cor} 14%, transparent)`,
                            color: etapa.cor,
                          }}
                        >
                          {etapa.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {p.cliente} {p.cidade ? `· ${p.cidade}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className={`text-xs font-semibold tabular-nums ${isPast ? "text-destructive" : isToday ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                        {isToday ? "Entrega Hoje!" : dataBR(p.entrega)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {moeda(p.valorTotal)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => sendWhatsAppMessage(p)}
                        className="size-8 grid place-items-center rounded-lg border bg-success/10 text-success hover:bg-success/20 transition"
                        title="Avisar cliente via WhatsApp"
                      >
                        <MessageCircle className="size-3.5" />
                      </button>
                      <Link
                        to="/pedidos/$pedidoId"
                        params={{ pedidoId: p.id }}
                        className="size-8 grid place-items-center rounded-lg border hover:bg-accent transition text-muted-foreground hover:text-foreground"
                        title="Ver detalhes do pedido"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <NovoPedidoDialog open={openNovoPedido} onOpenChange={setOpenNovoPedido} />
      <OrcamentoDialog open={openNovoOrcamento} onOpenChange={setOpenNovoOrcamento} />
    </AppShell>
  );
}
