import { useEffect, useState, type FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAddPagamento } from "@/hooks/use-pedidos";
import { moeda } from "@/lib/mock-data";

const FORMAS = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Boleto", "Transferência", "Entrada"];

export function AddPagamentoDialog({
  open,
  onOpenChange,
  pedidoId,
  numero,
  saldo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedidoId: string;
  numero?: string;
  saldo?: number;
}) {
  const add = useAddPagamento();
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState(FORMAS[0]);
  const [pagoEm, setPagoEm] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (open) {
      setValor("");
      setForma(FORMAS[0]);
      setPagoEm(new Date().toISOString().slice(0, 10));
      setObs("");
    }
  }, [open]);

  if (!open) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = Number(valor);
    if (!v || v <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    try {
      await add.mutateAsync({ pedido_id: pedidoId, valor: v, forma, pago_em: pagoEm, observacao: obs });
      toast.success(`Pagamento registrado${numero ? ` · ${numero}` : ""}`);
      onOpenChange(false);
    } catch (err) {
      toast.error("Erro ao registrar pagamento", { description: err instanceof Error ? err.message : "" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={() => onOpenChange(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border shadow-[var(--shadow-elevated)]">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold tracking-tight">Registrar pagamento</h3>
            {typeof saldo === "number" && (
              <p className="text-xs text-muted-foreground">Saldo restante: {moeda(saldo)}</p>
            )}
          </div>
          <button onClick={() => onOpenChange(false)} className="size-8 grid place-items-center rounded-lg hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium">Valor *</label>
            <input
              type="number"
              step="0.01"
              autoFocus
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Forma de pagamento</label>
              <select
                value={forma}
                onChange={(e) => setForma(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Data</label>
              <input
                type="date"
                value={pagoEm}
                onChange={(e) => setPagoEm(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Observação</label>
            <textarea
              rows={2}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          {saldo !== undefined && Number(valor) > saldo && (
            <p className="text-xs text-warning">Atenção: valor maior que o saldo restante.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => onOpenChange(false)} className="h-9 px-4 rounded-lg border text-sm hover:bg-accent">Cancelar</button>
            <button type="submit" disabled={add.isPending} className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
              {add.isPending && <Loader2 className="size-4 animate-spin" />} 
              {add.isPending ? "Salvando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
