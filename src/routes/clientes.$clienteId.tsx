import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ClienteDialog } from "@/components/cliente-dialog";
import {
  useCliente,
  usePedidosCliente,
  usePagamentosCliente,
  useDeleteCliente,
  type ClienteInput,
} from "@/hooks/use-clientes";
import { ETAPAS, moeda, dataBR } from "@/lib/mock-data";
import {
  Loader2,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  Wallet,
  Package,
  CreditCard,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes/$clienteId")({
  component: ClienteDetalhePage,
  head: () => ({ meta: [{ title: "Cliente · Sua bancada" }] }),
});

function ClienteDetalhePage() {
  const { clienteId } = Route.useParams();
  const { data: c, isLoading } = useCliente(clienteId);
  const { data: pedidos = [] } = usePedidosCliente(clienteId);
  const { data: pagamentos = [] } = usePagamentosCliente(clienteId);
  const del = useDeleteCliente();

  const [edit, setEdit] = useState<(ClienteInput & { id: string }) | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  if (isLoading || !c) {
    return (
      <AppShell title="Cliente" breadcrumbs={[{ label: "Clientes", to: "/clientes" }, { label: "Carregando…" }]}>
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  const totalGasto = pedidos.reduce((s, p) => s + p.valor_total, 0);
  const totalPago = pedidos.reduce((s, p) => s + p.valor_pago, 0);
  const saldo = totalGasto - totalPago;
  const ativos = pedidos.filter((p) => p.etapa !== "entregue");
  const inic = c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const apagar = async () => {
    try {
      await del.mutateAsync(c.id);
      toast.success(`${c.nome} removido`);
      window.history.back();
    } catch (e) {
      toast.error("Não foi possível remover", {
        description: e instanceof Error ? e.message : "",
      });
    }
    setConfirmar(false);
  };

  return (
    <AppShell
      title={c.nome}
      subtitle="Visão completa do cliente"
      breadcrumbs={[{ label: "Clientes", to: "/clientes" }, { label: c.nome }]}
    >
      {/* Header */}
      <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground grid place-items-center font-semibold">
              {inic || "—"}
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{c.nome}</h1>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {c.telefone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5" /> {c.telefone}
                  </span>
                )}
                {c.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="size-3.5" /> {c.email}
                  </span>
                )}
                {c.cidade && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {c.cidade}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setEdit({
                  id: c.id,
                  nome: c.nome,
                  telefone: c.telefone ?? "",
                  email: c.email ?? "",
                  cidade: c.cidade ?? "",
                  observacoes: c.observacoes ?? "",
                })
              }
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border bg-card text-sm hover:bg-accent"
            >
              <Pencil className="size-4" /> Editar
            </button>
            <button
              onClick={() => setConfirmar(true)}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/10"
            >
              <Trash2 className="size-4" /> Remover
            </button>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Metric label="Total comprado" value={moeda(totalGasto)} icon={Wallet} />
        <Metric label="Já recebido" value={moeda(totalPago)} icon={CreditCard} tone="success" />
        <Metric label="A receber" value={moeda(saldo)} icon={Wallet} tone={saldo > 0 ? "warning" : "muted"} />
        <Metric label="Produções ativas" value={String(ativos.length)} icon={Package} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pedidos */}
        <section className="rounded-2xl border bg-card shadow-[var(--shadow-soft)] lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold tracking-tight">Pedidos ({pedidos.length})</h2>
            <p className="text-xs text-muted-foreground">Histórico completo</p>
          </div>
          {pedidos.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Este cliente ainda não tem pedidos.
            </div>
          ) : (
            <ul className="divide-y">
              {pedidos.map((p) => {
                const etapa = ETAPAS.find((e) => e.id === p.etapa);
                return (
                  <li key={p.id}>
                    <Link
                      to="/pedidos/$pedidoId"
                      params={{ pedidoId: p.id }}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/40 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {p.produto}{" "}
                          <span className="text-muted-foreground font-normal">— {p.numero}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Entrega {p.entrega ? dataBR(p.entrega) : "—"}
                        </p>
                      </div>
                      {etapa && (
                        <span
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: `color-mix(in oklab, ${etapa.cor} 14%, transparent)`,
                            color: etapa.cor,
                          }}
                        >
                          {etapa.label}
                        </span>
                      )}
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold tabular-nums">{moeda(p.valor_total)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          pago {moeda(p.valor_pago)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Pagamentos + Observações */}
        <div className="space-y-5">
          <section className="rounded-2xl border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold tracking-tight">Pagamentos</h2>
              <p className="text-xs text-muted-foreground">{pagamentos.length} registro(s)</p>
            </div>
            {pagamentos.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum pagamento registrado.
              </div>
            ) : (
              <ul className="divide-y max-h-80 overflow-y-auto">
                {pagamentos.map((pg) => (
                  <li key={pg.id} className="px-5 py-3 text-sm">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-medium tabular-nums">{moeda(pg.valor)}</span>
                      <span className="text-xs text-muted-foreground">{dataBR(pg.pago_em)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {pg.pedido_numero} · {pg.forma ?? "—"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {c.observacoes && (
            <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="size-4 text-primary" />
                <h2 className="font-semibold tracking-tight text-sm">Observações</h2>
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{c.observacoes}</p>
            </section>
          )}
        </div>
      </div>

      <ClienteDialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)} initial={edit} />

      {confirmar && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmar(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-[var(--shadow-elevated)]"
          >
            <h3 className="font-semibold tracking-tight">Remover {c.nome}?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Esta ação não pode ser desfeita. Clientes com pedidos vinculados não podem ser removidos.
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

function Metric({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "muted";
}) {
  const toneCls =
    tone === "success"
      ? "text-success bg-success/10"
      : tone === "warning"
        ? "text-warning-foreground bg-warning/20"
        : tone === "muted"
          ? "text-muted-foreground bg-muted"
          : "text-primary bg-primary/10";
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className={`size-8 grid place-items-center rounded-lg ${toneCls}`}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}
