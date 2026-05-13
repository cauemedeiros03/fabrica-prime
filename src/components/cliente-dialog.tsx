import { useEffect, useState, type FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateCliente,
  useUpdateCliente,
  type ClienteInput,
} from "@/hooks/use-clientes";

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
          <Field label="Cidade / endereço" value={form.cidade || ""} onChange={(v) => set("cidade", v)} />
          <div>
            <label className="text-xs font-medium">Observações</label>
            <textarea
              value={form.observacoes || ""}
              onChange={(e) => set("observacoes", e.target.value)}
              rows={3}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
    </div>
  );
}
