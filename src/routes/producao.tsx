import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ETAPAS, moeda, dataBR, type StatusEtapa } from "@/lib/mock-data";
import { usePedidos, useUpdatePedidoEtapa } from "@/hooks/use-pedidos";
import { EtapaSelect } from "@/components/etapa-select";
import { useState, type DragEvent } from "react";
import { GripVertical, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/producao")({
  component: ProducaoPage,
  head: () => ({ meta: [{ title: "Produção · Marcena" }] }),
});

function ProducaoPage() {
  const { data: pedidos = [], isLoading } = usePedidos();
  const updateEtapa = useUpdatePedidoEtapa();
  const navigate = useNavigate();
  const [arrastando, setArrastando] = useState<string | null>(null);

  const onDragStart = (id: string) => setArrastando(id);
  const onDrop = async (e: DragEvent, etapa: StatusEtapa) => {
    e.preventDefault();
    if (!arrastando) return;
    const pedido = pedidos.find((p) => p.id === arrastando);
    setArrastando(null);
    if (!pedido || pedido.etapa === etapa) return;
    try {
      await updateEtapa.mutateAsync({ id: pedido.id, etapa });
      toast.success(`${pedido.numero} → ${ETAPAS.find((x) => x.id === etapa)?.label}`);
    } catch (err) {
      toast.error("Erro ao mover pedido", { description: err instanceof Error ? err.message : "" });
    }
  };

  return (
    <AppShell
      title="Fluxo de produção"
      subtitle={isLoading ? "Carregando…" : "Arraste os cards entre as etapas ou use o seletor para atualizar"}
    >
      <div className="overflow-x-auto -mx-6 lg:-mx-8 px-6 lg:px-8 pb-2">
        <div className="flex gap-4 min-w-max">
          {ETAPAS.map((etapa) => {
            const itens = pedidos.filter((p) => p.etapa === etapa.id);
            return (
              <div
                key={etapa.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, etapa.id)}
                className="w-72 shrink-0 rounded-2xl bg-muted/40 border p-3"
              >
                <div className="flex items-center justify-between px-1.5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: etapa.cor }} />
                    <p className="text-sm font-semibold tracking-tight">{etapa.label}</p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{itens.length}</span>
                </div>

                <div className="space-y-2 min-h-[40px]">
                  {itens.map((p) => {
                    const atrasado = new Date(p.entrega) < new Date() && p.etapa !== "entregue";
                    const pct = Math.round((p.valorPago / p.valorTotal) * 100);
                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => onDragStart(p.id)}
                        onClick={() => navigate({ to: "/pedidos/$pedidoId", params: { pedidoId: p.id } })}
                        className="group rounded-xl bg-card border p-3 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] cursor-pointer transition"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="size-3.5 text-muted-foreground/60 mt-0.5 opacity-0 group-hover:opacity-100 transition" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                                {p.numero}
                              </span>
                              {p.prioridade === "urgente" && (
                                <span className="text-[10px] font-semibold uppercase text-destructive">Urgente</span>
                              )}
                            </div>
                            <p className="text-sm font-medium leading-snug mt-0.5 line-clamp-2">{p.produto}</p>
                            <p className="text-xs text-muted-foreground mt-1">{p.cliente}</p>

                            <div className="mt-2.5">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                <span>Pago {pct}%</span>
                                <span className="tabular-nums">{moeda(p.valorTotal)}</span>
                              </div>
                              <div className="h-1 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between">
                              <div className={`inline-flex items-center gap-1 text-[11px] ${atrasado ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                <CalIcon className="size-3" />
                                {dataBR(p.entrega)}
                              </div>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">
                                {p.material}
                              </span>
                            </div>
                            <div className="mt-2.5 pt-2.5 border-t" onClick={(e) => e.stopPropagation()}>
                              <EtapaSelect pedidoId={p.id} etapa={p.etapa} numero={p.numero} variant="badge" className="w-full [&>select]:w-full" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
