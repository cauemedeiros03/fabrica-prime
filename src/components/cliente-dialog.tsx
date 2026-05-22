import { useEffect, useState, type FormEvent } from "react";
import { X, Loader2, Phone, Mail, MapPin, CreditCard, Wallet, FileText, Building, Instagram, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateCliente,
  useUpdateCliente,
  useCliente,
  usePedidosCliente,
  type ClienteInput,
} from "@/hooks/use-clientes";
import { moeda, dataBR, ETAPAS } from "@/lib/mock-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type EditState = (ClienteInput & { id: string }) | null;

export function ClienteDialog({
  open,
  onOpenChange,
  initial,
  defaultName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: EditState;
  defaultName?: string;
  onCreated?: (id: string) => void;
}) {
  const isEdit = !!initial;
  const create = useCreateCliente();
  const update = useUpdateCliente();

  const empty: ClienteInput = { nome: "", telefone: "", email: "", cidade: "", observacoes: "" };
  const [form, setForm] = useState<ClienteInput>(empty);

  useEffect(() => {
    if (open) setForm(initial ?? { ...empty, nome: defaultName ?? "" });
  }, [open, initial, defaultName]);

  const set = <K extends keyof ClienteInput>(k: K, v: ClienteInput[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ ...form, id: initial!.id });
        toast.success("Cliente atualizado");
      } else {
        const id = await create.mutateAsync(form);
        toast.success("Cliente criado");
        onCreated?.(id);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error("Não foi possível salvar", {
        description: err instanceof Error ? err.message : "",
      });
    }
  };

  if (!open) return null;
  const saving = create.isPending || update.isPending;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-card border shadow-[var(--shadow-elevated)]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {isEdit ? "Editar cliente" : "Novo cliente"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isEdit ? "Atualize os dados do cliente" : "Cadastre um novo cliente"}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="size-8 grid place-items-center rounded-lg hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-3">
          <Field label="Nome *" value={form.nome} onChange={(v) => set("nome", v)} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Telefone" value={form.telefone || ""} onChange={(v) => set("telefone", v)} />
            <Field label="E-mail" type="email" value={form.email || ""} onChange={(v) => set("email", v)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="CPF / CNPJ" value={form.cpf || ""} onChange={(v) => set("cpf", v)} />
            <Field label="Instagram" value={form.instagram || ""} onChange={(v) => set("instagram", v)} placeholder="@usuario" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <Field label="CEP" value={form.cep || ""} onChange={(v) => set("cep", v)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Endereço / Rua" value={form.endereco || ""} onChange={(v) => set("endereco", v)} />
            </div>
            <Field label="Número" value={form.numero || ""} onChange={(v) => set("numero", v)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Complemento" value={form.complemento || ""} onChange={(v) => set("complemento", v)} />
            <Field label="Bairro" value={form.bairro || ""} onChange={(v) => set("bairro", v)} />
            <Field label="Cidade" value={form.cidade || ""} onChange={(v) => set("cidade", v)} />
          </div>

          <div>
            <label className="text-xs font-medium">Observações</label>
            <textarea
              value={form.observacoes || ""}
              onChange={(e) => set("observacoes", e.target.value)}
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
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
              {isEdit ? "Salvar alterações" : "Criar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
    </div>
  );
}

export function ClienteDetailSheet({
  open,
  onOpenChange,
  clienteId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string | null;
}) {
  const { data: c, isLoading: loadingCliente } = useCliente(clienteId ?? undefined);
  const { data: pedidos = [], isLoading: loadingPedidos } = usePedidosCliente(clienteId ?? undefined);

  const isLoading = loadingCliente || loadingPedidos;

  const totalComprado = pedidos.reduce((sum, p) => sum + p.valor_total, 0);
  const qtdPedidos = pedidos.length;

  const getEnderecoCompleto = () => {
    if (!c) return null;
    const parts = [
      c.endereco ? `${c.endereco}, ${c.numero || "S/N"}` : null,
      c.complemento ? `(${c.complemento})` : null,
      c.bairro,
      c.cep ? `CEP: ${c.cep}` : null,
    ].filter(Boolean);
    return parts.join(" — ");
  };

  const enderecoCompleto = getEnderecoCompleto();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto bg-card border-l shadow-2xl flex flex-col h-full p-0">
        <SheetHeader className="px-6 py-5 border-b shrink-0">
          <SheetTitle className="text-xl font-bold tracking-tight">Histórico do Cliente</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : !c ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6">
            Cliente não encontrado.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Cabeçalho de Perfil */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-muted/30 border p-5 rounded-2xl">
              <div className="size-16 rounded-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                {c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "—"}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold text-foreground tracking-tight truncate">{c.nome}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Cadastrado em {dataBR(c.created_at)}</p>
              </div>
            </div>

            {/* Métricas Principais */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border bg-card p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Comprado</p>
                  <p className="mt-1 text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">{moeda(totalComprado)}</p>
                </div>
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Wallet className="size-5" />
                </div>
              </div>
              <div className="rounded-2xl border bg-card p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Qtd. de Pedidos</p>
                  <p className="mt-1 text-lg font-bold tracking-tight tabular-nums">{qtdPedidos} {qtdPedidos === 1 ? 'pedido' : 'pedidos'}</p>
                </div>
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="size-5" />
                </div>
              </div>
            </div>

            {/* Dados Cadastrais */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados Cadastrais</h4>
              <div className="border rounded-2xl bg-card divide-y overflow-hidden text-sm">
                {c.telefone && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Phone className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Telefone</span>
                      <span className="font-medium">{c.telefone}</span>
                    </div>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Mail className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground block font-medium">E-mail</span>
                      <span className="font-medium truncate block">{c.email}</span>
                    </div>
                  </div>
                )}
                {c.cidade && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Cidade</span>
                      <span className="font-medium">{c.cidade}</span>
                    </div>
                  </div>
                )}
                {enderecoCompleto && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Building className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Endereço Completo</span>
                      <span className="font-medium text-muted-foreground text-xs leading-relaxed">{enderecoCompleto}</span>
                    </div>
                  </div>
                )}
                {c.cpf && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">CPF / CNPJ</span>
                      <span className="font-medium tabular-nums">{c.cpf}</span>
                    </div>
                  </div>
                )}
                {c.instagram && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Instagram className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Instagram</span>
                      <span className="font-medium">{c.instagram}</span>
                    </div>
                  </div>
                )}
                {c.origem && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Tag className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Origem do Lead</span>
                      <span className="font-medium">{c.origem}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Observações */}
            {c.observacoes && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações</h4>
                <div className="border rounded-2xl bg-muted/20 p-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {c.observacoes}
                </div>
              </div>
            )}

            {/* Histórico de Pedidos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pedidos do Cliente</h4>
                <span className="text-xs text-muted-foreground">{pedidos.length} registrado(s)</span>
              </div>

              {pedidos.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-2xl text-muted-foreground text-sm">
                  Nenhum pedido cadastrado para este cliente.
                </div>
              ) : (
                <div className="border rounded-2xl bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                        <tr>
                          <th className="py-2.5 px-4 text-left">Pedido / Código</th>
                          <th className="py-2.5 px-4 text-left">Entrega</th>
                          <th className="py-2.5 px-4 text-left">Etapa</th>
                          <th className="py-2.5 px-4 text-right">Valor Total</th>
                          <th className="py-2.5 px-4 text-right">Saldo Devedor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-xs">
                        {pedidos.map((p) => {
                          const etapa = ETAPAS.find((e) => e.id === p.etapa);
                          const saldoDevedor = p.valor_total - p.valor_pago;
                          return (
                            <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{p.produto}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{p.numero}</div>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground tabular-nums">
                                {p.entrega ? dataBR(p.entrega) : "—"}
                              </td>
                              <td className="py-3 px-4">
                                {etapa ? (
                                  <span
                                    className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-block"
                                    style={{
                                      backgroundColor: `color-mix(in oklab, ${etapa.cor} 14%, transparent)`,
                                      color: etapa.cor,
                                    }}
                                  >
                                    {etapa.label}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-medium tabular-nums">
                                {moeda(p.valor_total)}
                              </td>
                              <td className={`py-3 px-4 text-right font-semibold tabular-nums ${saldoDevedor > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {moeda(saldoDevedor)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
