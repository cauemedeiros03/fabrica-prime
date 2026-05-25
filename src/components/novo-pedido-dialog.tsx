import { useEffect, useState, type FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ETAPAS, PRIORIDADE_LABEL, moeda, type StatusEtapa } from "@/lib/mock-data";
import { useCreatePedido, useUpdatePedido, type NovoPedidoInput } from "@/hooks/use-pedidos";
import { ClienteAutocomplete } from "@/components/cliente-autocomplete";
import { ClienteDialog } from "@/components/cliente-dialog";
import { supabase } from "@/integrations/supabase/client";

type EditState = (Partial<NovoPedidoInput> & { id?: string }) | null;

export function NovoPedidoDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: EditState;
}) {
  const isEdit = !!initial && !!initial.id;
  const create = useCreatePedido();
  const update = useUpdatePedido();

  const empty: NovoPedidoInput = {
    cliente_id: undefined,
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
    cpf: "",
    cep: "",
    endereco: "",
    numero_endereco: "",
    complemento: "",
    bairro: "",
    instagram: "",
    origem: "",
  };
  const [form, setForm] = useState<NovoPedidoInput>(empty);
  const [novoCliente, setNovoCliente] = useState<string | null>(null);

  useEffect(() => {
    if (open) setForm(initial ? { ...empty, ...initial } : empty);
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
        await update.mutateAsync({ ...form, id: initial!.id as string });
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
            {!isEdit && (
              <div className="md:col-span-2">
                <ClienteAutocomplete
                  value={form.cliente_id}
                  onSelect={(c) =>
                    setForm((s) => ({
                      ...s,
                      cliente_id: c?.id,
                      cliente_nome: c?.nome ?? "",
                      telefone: c?.telefone ?? "",
                      email: c?.email ?? "",
                      cidade: c?.cidade ?? "",
                      cpf: c?.cpf ?? "",
                      cep: c?.cep ?? "",
                      endereco: c?.endereco ?? "",
                      numero_endereco: c?.numero ?? "",
                      complemento: c?.complemento ?? "",
                      bairro: c?.bairro ?? "",
                      instagram: c?.instagram ?? "",
                      origem: c?.origem ?? "",
                    }))
                  }
                  onCreateNew={(nome) => setNovoCliente(nome)}
                />
              </div>
            )}

            <div className="md:col-span-2 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Nome do cliente *" value={form.cliente_nome} onChange={(v) => set("cliente_nome", v)} />
                <Field label="CPF / CNPJ" value={form.cpf || ""} onChange={(v) => set("cpf", v)} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Telefone" value={form.telefone || ""} onChange={(v) => set("telefone", v)} />
                <Field label="E-mail" type="email" value={form.email || ""} onChange={(v) => set("email", v)} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Instagram" value={form.instagram || ""} onChange={(v) => set("instagram", v)} placeholder="@usuario" />
                <div>
                  <label className="text-xs font-medium">Origem</label>
                  <select
                    value={form.origem || ""}
                    onChange={(e) => set("origem", e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">Selecione...</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Loja Física">Loja Física</option>
                    <option value="Indicação">Indicação</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="CEP" value={form.cep || ""} onChange={(v) => set("cep", v)} />
                <div className="col-span-2">
                  <Field label="Endereço / Rua" value={form.endereco || ""} onChange={(v) => set("endereco", v)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Número" value={form.numero_endereco || ""} onChange={(v) => set("numero_endereco", v)} />
                <div className="col-span-3">
                  <Field label="Complemento" value={form.complemento || ""} onChange={(v) => set("complemento", v)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Bairro" value={form.bairro || ""} onChange={(v) => set("bairro", v)} />
                <Field label="Cidade" value={form.cidade || ""} onChange={(v) => set("cidade", v)} />
              </div>
              
              {form.cliente_id && (
                <p className="text-[11px] text-muted-foreground">
                  Alterações aqui atualizam também a ficha do cliente.
                </p>
              )}
            </div>
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
              {saving ? "Salvando..." : (isEdit ? "Salvar alterações" : "Criar pedido")}
            </button>
          </div>
        </form>
      </div>

      <ClienteDialog
        open={!!novoCliente}
        onOpenChange={(v) => !v && setNovoCliente(null)}
        defaultName={novoCliente ?? ""}
        onCreated={async (id) => {
          try {
            const { data, error } = await supabase
              .from("clientes")
              .select("id, nome, telefone, email, cidade, cpf, cep, endereco, numero, complemento, bairro, instagram, origem")
              .eq("id", id)
              .single();
            if (error) throw error;
            if (data) {
              setForm((s) => ({
                ...s,
                cliente_id: data.id,
                cliente_nome: data.nome,
                telefone: data.telefone ?? "",
                email: data.email ?? "",
                cidade: data.cidade ?? "",
                cpf: data.cpf ?? "",
                cep: data.cep ?? "",
                endereco: data.endereco ?? "",
                numero_endereco: data.numero ?? "",
                complemento: data.complemento ?? "",
                bairro: data.bairro ?? "",
                instagram: data.instagram ?? "",
                origem: data.origem ?? "",
              }));
            }
          } catch (err) {
            console.error("Erro ao buscar dados do cliente criado:", err);
            setForm((s) => ({ ...s, cliente_id: id, cliente_nome: novoCliente ?? s.cliente_nome }));
          }
          setNovoCliente(null);
          toast.success("Cliente vinculado ao pedido");
        }}
      />
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

function Field({ label, value, onChange, type = "text", disabled, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
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
