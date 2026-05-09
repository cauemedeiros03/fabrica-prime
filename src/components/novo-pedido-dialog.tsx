import { useEffect, useState, type FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ETAPAS, PRIORIDADE_LABEL, moeda, type StatusEtapa } from "@/lib/mock-data";
import { useCreatePedido, useUpdatePedido, type NovoPedidoInput } from "@/hooks/use-pedidos";

type EditState = (NovoPedidoInput & { id: string }) | null;

export function NovoPedidoDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: EditState;
}) {
  const isEdit = !!initial;
  const create = useCreatePedido();
  const update = useUpdatePedido();

  const empty: NovoPedidoInput = {
    cliente_nome: "",
    telefone: "",
    email: "",
    cidade: "",
    produto: "",
    tipo: "",
    material: "",
    cor: "",
    observacoes: "",
    entrega: "",
    prioridade: "media",
    etapa: "pedido-recebido",
    valor_total: 0,
    valor_pago: 0,
  };
  const [form, setForm] = useState<NovoPedidoInput>(empty);

  useEffect(() => {
    if (open) setForm(initial ?? empty);
  }, [open, initial]);

  const restante = Math.max(0, (form.valor_total || 0) - (form.valor_pago || 0));
  const set = <K extends keyof NovoPedidoInput>(k: K, v: NovoPedidoInput[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.cliente_nome || !form.produto || form.valor_total <= 0) {
      toast.error("Preencha cliente, produto e valor total");
      return;
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ ...form, id: initial!.id });
        toast.success("Pedido atualizado");
      } else {
        await create.mutateAsync(form);
        toast.success("Pedido criado com sucesso");
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      toast.error("Não foi possível salvar", { description: msg });
    }
  };

  if (!open) return null;
  const saving = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => onOpenChange(false)}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl bg-card border shadow-[var(--shadow-elevated)] my-8"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {isEdit ? "Editar pedido" : "Novo pedido"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isEdit ? "Atualize os dados do pedido" : "Cadastre um novo pedido na produção"}
            </p>
          </div>
          <button onClick={() => onOpenChange(false)} className="size-8 grid place-items-center rounded-lg hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-6 max-h-[75vh] overflow-y-auto">
          <Section title="Cliente">
            <Field label="Nome do cliente *" value={form.cliente_nome} onChange={(v) => set("cliente_nome", v)} disabled={isEdit} />
            <Field label="Telefone" value={form.telefone || ""} onChange={(v) => set("telefone", v)} disabled={isEdit} />
            <Field label="E-mail" type="email" value={form.email || ""} onChange={(v) => set("email", v)} disabled={isEdit} />
            <Field label="Cidade" value={form.cidade || ""} onChange={(v) => set("cidade", v)} disabled={isEdit} />
          </Section>

          <Section title="Produto">
            <Field label="Nome do produto *" value={form.produto} onChange={(v) => set("produto", v)} />
            <Field label="Tipo do móvel" value={form.tipo || ""} onChange={(v) => set("tipo", v)} />
            <Field label="Material" value={form.material || ""} onChange={(v) => set("material", v)} />
            <Field label="Cor / acabamento" value={form.cor || ""} onChange={(v) => set("cor", v)} />
            <div className="md:col-span-2">
              <label className="text-xs font-medium">Observações / medidas</label>
              <textarea
                value={form.observacoes || ""}
                onChange={(e) => set("observacoes", e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </Section>

          <Section title="Entrega & Status">
            <Field label="Data estimada de entrega" type="date" value={form.entrega || ""} onChange={(v) => set("entrega", v)} />
            <SelectField label="Prioridade" value={form.prioridade} onChange={(v) => set("prioridade", v as NovoPedidoInput["prioridade"])}>
              {(["baixa", "media", "alta", "urgente"] as const).map((p) => (
                <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>
              ))}
            </SelectField>
            <SelectField label="Etapa" value={form.etapa} onChange={(v) => set("etapa", v as StatusEtapa)}>
              {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </SelectField>
          </Section>

          <Section title="Financeiro">
            <Field label="Valor total *" type="number" value={String(form.valor_total)} onChange={(v) => set("valor_total", Number(v) || 0)} />
            <Field label="Valor pago / entrada" type="number" value={String(form.valor_pago)} onChange={(v) => set("valor_pago", Number(v) || 0)} />
            <div className="md:col-span-2 rounded-lg border bg-muted/40 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saldo restante (calculado)</span>
              <span className="text-lg font-semibold tabular-nums">{moeda(restante)}</span>
            </div>
          </Section>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 rounded-lg border text-sm hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Salvar alterações" : "Criar pedido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", disabled }: { label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
      >
        {children}
      </select>
    </div>
  );
}
