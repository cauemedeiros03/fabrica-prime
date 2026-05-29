import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { X, Loader2, Paperclip, FileText } from "lucide-react";
import { toast } from "sonner";
import { ETAPAS, PRIORIDADE_LABEL, moeda, type StatusEtapa } from "@/lib/mock-data";
import { useCreatePedido, useUpdatePedido, type NovoPedidoInput } from "@/hooks/use-pedidos";
import { ClienteAutocomplete } from "@/components/cliente-autocomplete";
import { ClienteDialog } from "@/components/cliente-dialog";
import { supabase } from "@/integrations/supabase/client";

// Funções puras fora do componente — não são recriadas a cada render
function getFileNameFromUrl(url: string): string {
  try {
    const decoded = decodeURIComponent(url);
    const parts = decoded.split("/");
    return parts[parts.length - 1].split("?")[0];
  } catch {
    return "Arquivo";
  }
}

function isImageUrl(url: string): boolean {
  const name = getFileNameFromUrl(url).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((ext) => name.endsWith(ext));
}

const EMPTY_FORM: NovoPedidoInput = {
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
  anexos: [],
};

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

  // useMemo garante que o objeto de reset só muda quando `initial` muda,
  // impedindo o useEffect abaixo de disparar em loop infinito.
  const initialForm = useMemo<NovoPedidoInput>(
    () => (initial ? { ...EMPTY_FORM, ...initial } : EMPTY_FORM),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initial?.id]
  );

  const [form, setForm] = useState<NovoPedidoInput>(initialForm);
  const [novoCliente, setNovoCliente] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // getFileNameFromUrl e isImageUrl agora são funções puras fora do componente (acima)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFiles(e.dataTransfer.files);
    }
  // uploadFiles é estável via useCallback abaixo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadFiles = useCallback(async (files: FileList) => {
    setIsUploading(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImg = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";

      if (!isImg && !isPdf) {
        toast.error(`Formato não suportado: ${file.name}. Envie imagens (JPG/PNG) ou PDF.`);
        continue;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `pedidos/${fileName}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from("anexos-pedidos")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("anexos-pedidos")
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
        toast.success(`Upload concluído: ${file.name}`);
      } catch (err: any) {
        console.error("Erro no upload:", err);
        toast.error(`Erro ao enviar ${file.name}: ${err?.message || "Erro desconhecido"}`);
      }
    }

    if (newUrls.length > 0) {
      setForm((s) => ({ ...s, anexos: [...(s.anexos || []), ...newUrls] }));
    }
    setIsUploading(false);
  }, []);

  const removeAnexo = useCallback((urlToRemove: string) => {
    setForm((s) => ({ ...s, anexos: (s.anexos || []).filter((url) => url !== urlToRemove) }));
  }, []);

  // Reseta o formulário sempre que o dialog abre ou o pedido editado muda.
  // Depende de `initialForm` (estável via useMemo) — sem risco de loop infinito.
  useEffect(() => {
    if (open) setForm(initialForm);
  }, [open, initialForm]);

  // Dirty state: true se o usuário alterou algum campo
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  // Fechamento seguro: dispara alerta se o form estiver sujo
  const handleClose = useCallback(() => {
    if (isDirty && !window.confirm("Você tem dados não salvos. Deseja fechar mesmo assim?")) return;
    onOpenChange(false);
  }, [isDirty, onOpenChange]);

  const restante = Math.max(0, (form.valor_total || 0) - (form.valor_pago || 0));
  const set = <K extends keyof NovoPedidoInput>(k: K, v: NovoPedidoInput[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await update.mutateAsync({ ...form, id: initial!.id as string });
        toast.success("Pedido atualizado");
      } else {
        await create.mutateAsync(form);
        toast.success("Pedido criado com sucesso");
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error("ERRO SUPABASE:", err);
      const msg = err?.message || err?.details || JSON.stringify(err);
      toast.error("Não foi possível salvar", { description: msg });
    }
  };

  if (!open) return null;
  const saving = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4 overflow-y-auto">
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
          <button onClick={handleClose} className="size-8 grid place-items-center rounded-lg hover:bg-accent">
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

          <Section title="Anexos do Projeto (Fotos / PDFs)">
            <div className="md:col-span-2 space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-primary bg-primary/5 scale-[0.99]"
                    : "border-muted-foreground/20 bg-background hover:bg-accent/40"
                }`}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Fazendo upload dos arquivos...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto size-10 rounded-full bg-accent flex items-center justify-center">
                      <Paperclip className="size-5 text-muted-foreground" />
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-primary">Clique para anexar</span> ou arraste arquivos aqui
                    </div>
                    <p className="text-xs text-muted-foreground">Imagens (JPG, PNG) e PDFs (Máx 10MB)</p>
                  </div>
                )}
              </div>

              {form.anexos && form.anexos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                  {form.anexos.map((url, idx) => {
                    const isImg = isImageUrl(url);
                    const name = getFileNameFromUrl(url);
                    return (
                      <div key={idx} className="relative group rounded-xl border bg-card overflow-hidden aspect-video flex flex-col items-center justify-center p-2 shadow-sm">
                        {isImg ? (
                          <img
                            src={url}
                            alt="Anexo"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-2">
                            <FileText className="size-8 text-destructive/80 mb-1" />
                            <span className="text-xs font-medium truncate max-w-[120px] text-muted-foreground">
                              {name}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAnexo(url)}
                          className="absolute top-1 right-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Section>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 px-4 rounded-lg border text-sm hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || isUploading}
              className="h-10 px-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {(saving || isUploading) && <Loader2 className="size-4 animate-spin" />}
              {isUploading ? "Enviando arquivos..." : saving ? "Salvando..." : (isEdit ? "Salvar alterações" : "Criar pedido")}
            </button>
          </div>
        </form>
      </div>

      <ClienteDialog
        open={novoCliente !== null}
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
