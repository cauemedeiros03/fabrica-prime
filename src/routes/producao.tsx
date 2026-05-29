import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ETAPAS, moeda, dataBR, type StatusEtapa } from "@/lib/mock-data";
import { usePedidos, useUpdatePedidoEtapa, useDuplicatePedido, useDeletePedido, useAddPagamento, type NovoPedidoInput } from "@/hooks/use-pedidos";
import { PedidoCard } from "@/components/pedido-card";
import { NovoPedidoDialog } from "@/components/novo-pedido-dialog";
import { AddPagamentoDialog } from "@/components/add-pagamento-dialog";
import { useState, type DragEvent, useRef, useEffect } from "react";
import { toast } from "sonner";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { Loader2 } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { PrintableReceipt } from "@/components/printable-receipt";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/producao")({
  component: ProducaoPage,
  head: () => ({ meta: [{ title: "Produção · Sua bancada" }] }),
});

function ProducaoPage() {
  const { data: pedidos = [], isLoading } = usePedidos();
  const updateEtapa = useUpdatePedidoEtapa();
  const dup = useDuplicatePedido();
  const del = useDeletePedido();
  const addPagamento = useAddPagamento();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [arrastando, setArrastando] = useState<string | null>(null);
  
  const [edit, setEdit] = useState<(NovoPedidoInput & { id: string }) | null>(null);
  const [confirmar, setConfirmar] = useState<{ id: string; numero: string } | null>(null);
  const [quitarSaldo, setQuitarSaldo] = useState<{ id: string; numero: string; saldo: number } | null>(null);

  const [config, setConfig] = useState<any>(null);
  const [printPedido, setPrintPedido] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => setPrintPedido(null),
  });

  useEffect(() => {
    async function loadConfig() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("configuracoes_marcenaria")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          setConfig(data);
        }
      } catch (err) {
        console.error("Erro ao buscar configurações da marcenaria:", err);
      }
    }
    loadConfig();
  }, [user]);

  useEffect(() => {
    if (printPedido) {
      handlePrint();
    }
  }, [printPedido]);

  const editar = (p: any) => {
    setEdit({
      id: p.id,
      cliente_id: p.clienteId,
      cliente_nome: p.cliente,
      telefone: p.telefone,
      cidade: p.cidade,
      email: p.email ?? "",
      produto: p.produto,
      tipo: p.tipo,
      material: p.material,
      cor: p.cor,
      observacoes: p.observacoes ?? "",
      entrega: p.entrega ? new Date(p.entrega).toISOString().slice(0, 10) : "",
      prioridade: p.prioridade,
      etapa: p.etapa,
      valor_total: p.valorTotal,
      valor_pago: p.valorPago,
      cpf: p.cpf ?? "",
      cep: p.cep ?? "",
      endereco: p.endereco ?? "",
      numero_endereco: p.numero_endereco ?? "",
      complemento: p.complemento ?? "",
      bairro: p.bairro ?? "",
      instagram: p.instagram ?? "",
      origem: p.origem ?? "",
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

  const handleQuitarSaldo = async () => {
    if (!quitarSaldo) return;
    try {
      await addPagamento.mutateAsync({
        pedido_id: quitarSaldo.id,
        valor: quitarSaldo.saldo,
        forma: "Quitação automática",
      });
      toast.success("Saldo quitado com sucesso!");
    } catch (e) {
      toast.error("Erro ao quitar saldo", { description: e instanceof Error ? e.message : "" });
    }
    setQuitarSaldo(null);
  };

  const onDragStart = (id: string) => setArrastando(id);
  const onDrop = async (e: DragEvent, etapa: StatusEtapa) => {
    e.preventDefault();
    if (!arrastando) return;
    const pedido = pedidos.find((p) => p.id === arrastando);
    setArrastando(null);
    if (!pedido || pedido.etapa === etapa) return;
    // etapaAnterior capturado antes do onMutate alterar o cache
    const etapaAnterior = pedido.etapa;
    try {
      await updateEtapa.mutateAsync({ id: pedido.id, etapa, etapaAnterior });
      
      const novaLabel = ETAPAS.find((x) => x.id === etapa)?.label;
      const pedidoAtualizado = { ...pedido, etapa };
      
      toast.success(`Status atualizado para ${novaLabel}`, {
        action: {
          label: "Avisar Cliente",
          onClick: () => sendWhatsAppMessage(pedidoAtualizado)
        }
      });

      if (etapa === "entregue") {
         const saldo = pedido.valorTotal - pedido.valorPago;
         if (saldo > 0) {
           setQuitarSaldo({ id: pedido.id, numero: pedido.numero, saldo });
         }
      }
    } catch (err) {
      toast.error("Erro ao mover pedido", { description: err instanceof Error ? err.message : "" });
    }
  };


  return (
    <AppShell
      title="Fluxo de produção"
      subtitle={isLoading ? "Carregando…" : "Arraste os cards entre as etapas ou use o seletor para atualizar"}
      breadcrumbs={[{ label: "Produção" }]}
    >
      <div className="overflow-x-auto -mx-6 lg:-mx-8 px-6 lg:px-8 pb-2">
        <div className="flex gap-4 min-w-max">
          {ETAPAS.map((etapa) => {
            const itensEtapa = pedidos.filter((p) => p.etapa === etapa.id);
            const totalItens = itensEtapa.length;
            const itens = etapa.id === "entregue" ? itensEtapa.slice(0, 10) : itensEtapa;
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
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {etapa.id === "entregue" && totalItens > 10 ? `10 de ${totalItens}` : totalItens}
                  </span>
                </div>

                <div className="space-y-2 min-h-[40px]">
                  {itens.map((p) => (
                    <PedidoCard
                      key={p.id}
                      p={p}
                      wrapperProps={{
                        draggable: true,
                        onDragStart: () => onDragStart(p.id)
                      }}
                      onClick={() => navigate({ to: "/pedidos/$pedidoId", params: { pedidoId: p.id } })}
                      onEdit={() => editar(p)}
                      onDuplicate={async () => {
                          try {
                            const id = await dup.mutateAsync(p.id);
                            toast.success(`Pedido duplicado a partir de ${p.numero}`);
                            navigate({ to: "/pedidos/$pedidoId", params: { pedidoId: id } });
                          } catch (e) {
                            toast.error("Erro ao duplicar", { description: e instanceof Error ? e.message : "" });
                          }
                      }}
                      onDelete={() => setConfirmar({ id: p.id, numero: p.numero })}
                      onPrint={() => setPrintPedido(p)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
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

      {quitarSaldo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={() => setQuitarSaldo(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-[var(--shadow-elevated)] animate-in fade-in zoom-in-95">
            <h3 className="font-semibold tracking-tight">Quitar Saldo Restante?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              O pedido <strong>{quitarSaldo.numero}</strong> foi avançado. Deseja quitar o saldo restante de <strong>{moeda(quitarSaldo.saldo)}</strong> agora?
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setQuitarSaldo(null)} className="h-9 px-4 rounded-lg border text-sm hover:bg-accent">Não, depois</button>
              <button onClick={handleQuitarSaldo} disabled={addPagamento.isPending} className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {addPagamento.isPending && <Loader2 className="size-4 animate-spin" />} Sim, quitar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="hidden">
        <PrintableReceipt ref={printRef} pedido={printPedido} config={config} />
      </div>
    </AppShell>
  );
}
