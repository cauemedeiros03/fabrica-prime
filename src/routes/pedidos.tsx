import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ETAPAS, moeda, dataBR, PRIORIDADE_LABEL } from "@/lib/mock-data";
import { usePedidos, useDeletePedido, type NovoPedidoInput } from "@/hooks/use-pedidos";
import { NovoPedidoDialog } from "@/components/novo-pedido-dialog";
import { EtapaSelect } from "@/components/etapa-select";
import { Filter, Download, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

type EditState = (NovoPedidoInput & { id: string }) | null;

function PedidosPage() {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "atrasados" | "semana" | "pagamento">("todos");
  const { data: pedidos = [], isLoading } = usePedidos();
  const del = useDeletePedido();
  const navigate = useNavigate();
  const [edit, setEdit] = useState<EditState>(null);
  const [confirmar, setConfirmar] = useState<{ id: string; numero: string } | null>(null);

  const filtrados = pedidos.filter((p) => {
    const matchQ = [p.cliente, p.produto, p.numero, p.tipo, p.cidade]
      .join(" ").toLowerCase().includes(q.toLowerCase());
    if (!matchQ) return false;
    if (filtro === "atrasados") return new Date(p.entrega) < new Date() && p.etapa !== "entregue";
    if (filtro === "semana") {
      const d = +new Date(p.entrega) - +new Date();
      return d > 0 && d < 1000 * 60 * 60 * 24 * 7;
    }
    if (filtro === "pagamento") return p.valorPago < p.valorTotal;
    return true;
  });

  const editar = (p: (typeof pedidos)[number]) => {
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
  };

  const apagar = async () => {
    if (!confirmar) return;
    try {
      await del.mutateAsync(confirmar.id);
      toast.success(`Pedido ${confirmar.numero} removido`);
    } catch (e: unknown) {
      toast.error("Erro ao remover", { description: e instanceof Error ? e.message : "" });
    }
    setConfirmar(null);
  };

  return (
    <AppShell title="Pedidos" subtitle={isLoading ? "Carregando…" : `${filtrados.length} pedidos encontrados`} breadcrumbs={[{ label: "Pedidos" }]}>
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
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                  <Loader2 className="inline size-4 animate-spin mr-2" /> Carregando pedidos…
                </td></tr>
              )}
              {!isLoading && filtrados.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground text-sm">
                  Nenhum pedido encontrado. Crie seu primeiro pedido pelo botão "Novo pedido".
                </td></tr>
              )}
              {filtrados.map((p) => {
                const atrasado = new Date(p.entrega) < new Date() && p.etapa !== "entregue";
                const pct = (p.valorPago / p.valorTotal) * 100;
                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate({ to: "/pedidos/$pedidoId", params: { pedidoId: p.id } })}
                    className="hover:bg-accent/40 transition cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{p.numero}</div>
                      <div className="text-xs text-muted-foreground">{p.produto}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>{p.cliente}</div>
                      <div className="text-xs text-muted-foreground">{p.cidade}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <EtapaSelect pedidoId={p.id} etapa={p.etapa} numero={p.numero} variant="badge" />
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
                    <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => editar(p)} className="size-8 grid place-items-center rounded-md hover:bg-accent" title="Editar">
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => setConfirmar({ id: p.id, numero: p.numero })} className="size-8 grid place-items-center rounded-md hover:bg-destructive/10 text-destructive" title="Remover">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <NovoPedidoDialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)} initial={edit} />

      {confirmar && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={() => setConfirmar(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-[var(--shadow-elevated)]">
            <h3 className="font-semibold tracking-tight">Remover pedido {confirmar.numero}?</h3>
            <p className="text-sm text-muted-foreground mt-1">Essa ação não pode ser desfeita. Pagamentos e histórico de etapas também serão apagados.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmar(null)} className="h-9 px-4 rounded-lg border text-sm hover:bg-accent">Cancelar</button>
              <button onClick={apagar} disabled={del.isPending} className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {del.isPending && <Loader2 className="size-4 animate-spin" />} Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
