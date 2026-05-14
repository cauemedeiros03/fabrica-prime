import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EtapaSelect } from "@/components/etapa-select";
import { NovoPedidoDialog } from "@/components/novo-pedido-dialog";
import { AddPagamentoDialog } from "@/components/add-pagamento-dialog";
import {
  usePedido,
  useEtapasHistorico,
  usePagamentosPedido,
  useDeletePedido,
  useDuplicatePedido,
  useReagendarEntrega,
  type NovoPedidoInput,
} from "@/hooks/use-pedidos";
import { ETAPAS, moeda, dataBR, PRIORIDADE_LABEL } from "@/lib/mock-data";
import {
  Loader2,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Wallet,
  AlertTriangle,
  ClipboardList,
  History,
  Copy,
  Plus,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pedidos/$pedidoId")({
  component: PedidoDetalhePage,
  head: () => ({ meta: [{ title: "Pedido · Marcena" }] }),
});

function PedidoDetalhePage() {
  const { pedidoId } = Route.useParams();
  const navigate = useNavigate();
  const { data: p, isLoading } = usePedido(pedidoId);
  const { data: historico = [] } = useEtapasHistorico(pedidoId);
  const { data: pagamentos = [] } = usePagamentosPedido(pedidoId);
  const del = useDeletePedido();
  const dup = useDuplicatePedido();
  const reagendar = useReagendarEntrega();
  const [edit, setEdit] = useState<(NovoPedidoInput & { id: string }) | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [pagamentoOpen, setPagamentoOpen] = useState(false);

  if (isLoading || !p) {
    return (
      <AppShell title="Pedido" breadcrumbs={[{ label: "Pedidos", to: "/pedidos" }, { label: "Carregando…" }]}>
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  const etapa = ETAPAS.find((e) => e.id === p.etapa)!;
  const saldo = p.valorTotal - p.valorPago;
  const pct = Math.round((p.valorPago / p.valorTotal) * 100);
  const atrasado = new Date(p.entrega) < new Date() && p.etapa !== "entregue";
  const diasFalta = Math.ceil((+new Date(p.entrega) - Date.now()) / (1000 * 60 * 60 * 24));

  const editar = () =>
    setEdit({
      id: p.id,
      cliente_nome: p.cliente,
      telefone: p.telefone,
      cidade: p.cidade,
      email: (p as unknown as { email?: string }).email ?? "",
      produto: p.produto,
      tipo: p.tipo,
      material: p.material,
      cor: p.cor,
      observacoes: (p as unknown as { observacoes?: string }).observacoes ?? "",
      entrega: p.entrega ? new Date(p.entrega).toISOString().slice(0, 10) : "",
      prioridade: p.prioridade,
      etapa: p.etapa,
      valor_total: p.valorTotal,
      valor_pago: p.valorPago,
    });

  const apagar = async () => {
    try {
      await del.mutateAsync(p.id);
      toast.success(`Pedido ${p.numero} removido`);
      window.history.back();
    } catch (e) {
      toast.error("Erro ao remover", { description: e instanceof Error ? e.message : "" });
    }
    setConfirmar(false);
  };

  return (
    <AppShell
      title={`Pedido ${p.numero}`}
      subtitle={p.produto}
      breadcrumbs={[{ label: "Pedidos", to: "/pedidos" }, { label: p.numero }]}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `color-mix(in oklab, ${etapa.cor} 14%, transparent)`, color: etapa.cor }}
          >
            {etapa.label}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-muted">
            Prioridade: {PRIORIDADE_LABEL[p.prioridade]}
          </span>
          {atrasado && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-3" /> Atrasado
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <EtapaSelect pedidoId={p.id} etapa={p.etapa} numero={p.numero} />
          <button
            onClick={() => setPagamentoOpen(true)}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="size-4" /> Pagamento
          </button>
          <button
            onClick={editar}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border bg-card text-sm hover:bg-accent"
          >
            <Pencil className="size-4" /> Editar
          </button>
          <button
            onClick={async () => {
              try {
                const novoId = await dup.mutateAsync(p.id);
                toast.success("Pedido duplicado");
                navigate({ to: "/pedidos/$pedidoId", params: { pedidoId: novoId } });
              } catch (e) {
                toast.error("Erro ao duplicar", { description: e instanceof Error ? e.message : "" });
              }
            }}
            disabled={dup.isPending}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border bg-card text-sm hover:bg-accent disabled:opacity-60"
          >
            {dup.isPending ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />} Duplicar
          </button>
          <button
            onClick={() => setConfirmar(true)}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/10"
          >
            <Trash2 className="size-4" /> Remover
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Resumo financeiro */}
        <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Resumo financeiro</h2>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor total</span>
              <span className="font-medium tabular-nums">{moeda(p.valorTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pago</span>
              <span className="font-medium tabular-nums text-success">{moeda(p.valorPago)}</span>
            </div>
            <div className="flex justify-between border-t pt-2.5">
              <span className="text-muted-foreground">Saldo restante</span>
              <span className="font-semibold tabular-nums">{moeda(saldo)}</span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progresso de pagamento</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {pagamentos.length > 0 && (
            <div className="mt-5 pt-4 border-t">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Pagamentos
              </p>
              <ul className="space-y-1.5 text-sm">
                {pagamentos.map((pg) => (
                  <li key={pg.id} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {dataBR(pg.pago_em)} · {pg.forma ?? "—"}
                    </span>
                    <span className="tabular-nums font-medium">{moeda(Number(pg.valor))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Cliente + Entrega */}
        <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Cliente & entrega</h2>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium">{p.cliente}</p>
            {p.telefone && (
              <Link
                to="/clientes"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
              >
                <Phone className="size-3.5" /> {p.telefone}
              </Link>
            )}
            {(p as unknown as { email?: string }).email && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-3.5" /> {(p as unknown as { email?: string }).email}
              </p>
            )}
            {p.cidade && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-3.5" /> {p.cidade}
              </p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Entrega prevista:</span>
              <span className={`tabular-nums font-medium ${atrasado ? "text-destructive" : ""}`}>
                {dataBR(p.entrega)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {atrasado
                ? `Atrasado em ${Math.abs(diasFalta)} dia(s)`
                : `Faltam ${diasFalta} dia(s) para a entrega`}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <CalendarClock className="size-3.5 text-muted-foreground" />
              <input
                type="date"
                defaultValue={p.entrega ? new Date(p.entrega).toISOString().slice(0, 10) : ""}
                onChange={async (e) => {
                  const v = e.target.value;
                  if (!v) return;
                  try {
                    await reagendar.mutateAsync({ id: p.id, entrega: v });
                    toast.success("Entrega reagendada");
                  } catch (err) {
                    toast.error("Erro ao reagendar", { description: err instanceof Error ? err.message : "" });
                  }
                }}
                className="h-8 px-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              {reagendar.isPending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
            </div>
          </div>
        </section>

        {/* Especificações */}
        <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-sm font-semibold tracking-tight mb-3">Especificações</h2>
          <dl className="space-y-2 text-sm">
            <Item label="Produto" value={p.produto} />
            <Item label="Tipo" value={p.tipo || "—"} />
            <Item label="Material" value={p.material || "—"} />
            <Item label="Cor / acabamento" value={p.cor || "—"} />
            {(p as unknown as { observacoes?: string }).observacoes && (
              <div className="pt-2 border-t">
                <dt className="text-xs text-muted-foreground mb-1">Observações</dt>
                <dd className="whitespace-pre-wrap">
                  {(p as unknown as { observacoes?: string }).observacoes}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Timeline */}
        <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <History className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Linha do tempo</h2>
          </div>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma alteração registrada ainda. Atualize a etapa para começar o histórico.
            </p>
          ) : (
            <ol className="relative border-l ml-2 space-y-4">
              {historico.map((h) => {
                const e = ETAPAS.find((x) => x.id === h.etapa_nova);
                const ant = ETAPAS.find((x) => x.id === h.etapa_anterior);
                return (
                  <li key={h.id} className="pl-5">
                    <span
                      className="absolute -left-1.5 size-3 rounded-full border-2 border-background"
                      style={{ backgroundColor: e?.cor ?? "var(--primary)" }}
                    />
                    <p className="text-sm">
                      <span className="font-medium">{e?.label ?? h.etapa_nova}</span>
                      {ant && <span className="text-muted-foreground"> · vindo de {ant.label}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </p>
                    {h.observacao && <p className="text-sm mt-1">{h.observacao}</p>}
                  </li>
                );
              })}
              <li className="pl-5">
                <span className="absolute -left-1.5 size-3 rounded-full border-2 border-background bg-muted-foreground/40" />
                <p className="text-sm font-medium">Pedido criado</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.criadoEm).toLocaleString("pt-BR")}
                </p>
              </li>
            </ol>
          )}
        </section>
      </div>

      <NovoPedidoDialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)} initial={edit} />

      {confirmar && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmar(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-[var(--shadow-elevated)]"
          >
            <h3 className="font-semibold tracking-tight">Remover pedido {p.numero}?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Essa ação não pode ser desfeita. Pagamentos e histórico de etapas também serão apagados.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setConfirmar(false)}
                className="h-9 px-4 rounded-lg border text-sm hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={apagar}
                disabled={del.isPending}
                className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {del.isPending && <Loader2 className="size-4 animate-spin" />} Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right truncate">{value}</dd>
    </div>
  );
}
