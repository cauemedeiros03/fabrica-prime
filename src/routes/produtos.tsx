import { createFileRoute } from "@tanstack/react-router";
import { useState, FormEvent, useEffect, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import {
  useCreateProduto,
  useUpdateProduto,
  useDeleteProduto,
  type ProdutoInput,
  type Produto,
} from "@/hooks/use-produtos";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { moeda } from "@/lib/mock-data";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  PackageOpen,
  X,
  Package,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/produtos")({
  component: ProdutosPage,
  head: () => ({ meta: [{ title: "Produtos · Sua bancada" }] }),
});

function ProdutosPage() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const del = useDeleteProduto();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<(ProdutoInput & { id: string }) | null>(null);
  const [confirmar, setConfirmar] = useState<Produto | null>(null);

  const fetchProdutos = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("catalogo_produtos")
        .select("id, nome, descricao, preco, created_at")
        .order("nome", { ascending: true });
        
      console.log('Produtos fetch:', data, error);
        
      if (error) throw error;
      
      setProdutos(
        (data || []).map((p) => ({
          ...p,
          preco: p.preco ? Number(p.preco) : null,
        })) as Produto[]
      );
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProdutos();
    }
  }, [user?.id]);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (p.descricao ?? "").toLowerCase().includes(q)
    );
  }, [produtos, query]);

  const abrirEditar = (p: Produto) =>
    setEdit({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? "",
      preco: p.preco ?? undefined,
    });

  const apagar = async () => {
    if (!confirmar) return;
    try {
      await del.mutateAsync(confirmar.id);
      toast.success(`${confirmar.nome} removido`);
      fetchProdutos();
    } catch (e) {
      toast.error("Não foi possível remover", {
        description: e instanceof Error ? e.message : "",
      });
      console.error("Erro ao remover:", e);
    }
    setConfirmar(null);
  };

  return (
    <AppShell title="Produtos" subtitle={`${produtos.length} item(ns) no catálogo`}>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <button
          onClick={() => setOpen(true)}
          className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="size-4" /> Novo produto
        </button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <PackageOpen className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">Nenhum produto encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            {query ? "Tente outro termo de busca." : "Cadastre o primeiro produto no catálogo."}
          </p>
          {!query && (
            <button
              onClick={() => setOpen(true)}
              className="mt-4 h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              <Plus className="size-4" /> Cadastrar produto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtrados.map((p) => (
            <div
              key={p.id}
              className="group rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] transition flex flex-col h-full relative"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Package className="size-5" />
                </div>
                <div className="flex md:hidden items-center gap-1">
                  <button
                    onClick={() => abrirEditar(p)}
                    className="size-8 grid place-items-center rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmar(p)}
                    className="size-8 grid place-items-center rounded-lg border border-destructive/30 bg-card text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base tracking-tight truncate" title={p.nome}>{p.nome}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={p.descricao || ""}>
                  {p.descricao || "Sem descrição"}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {p.preco != null ? moeda(p.preco) : "Sob consulta"}
                </span>
              </div>

              <div className="hidden md:flex absolute top-4 right-4 items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => abrirEditar(p)}
                  className="size-8 grid place-items-center rounded-lg border bg-card hover:bg-accent"
                  aria-label="Editar"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => setConfirmar(p)}
                  className="size-8 grid place-items-center rounded-lg border border-destructive/30 bg-card text-destructive hover:bg-destructive/10"
                  aria-label="Remover"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      <ProdutoDialog
        open={open || !!edit}
        onOpenChange={(v) => {
          if (!v) {
            setOpen(false);
            setEdit(null);
          }
        }}
        initial={edit}
        onSuccess={fetchProdutos}
      />

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmar && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmar(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-card border p-6 shadow-[var(--shadow-elevated)]"
          >
            <h3 className="font-semibold tracking-tight">Remover item?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Deseja remover <strong>{confirmar.nome}</strong> do catálogo?
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setConfirmar(null)}
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

function ProdutoDialog({
  open,
  onOpenChange,
  initial,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: (ProdutoInput & { id: string }) | null;
  onSuccess?: () => void;
}) {
  const isEdit = !!initial;
  const create = useCreateProduto();
  const update = useUpdateProduto();

  const [form, setForm] = useState<ProdutoInput>({ nome: "", descricao: "", preco: undefined });

  useEffect(() => {
    if (open) {
      setForm(initial ?? { nome: "", descricao: "", preco: undefined });
    }
  }, [open, initial]);

  const set = <K extends keyof ProdutoInput>(k: K, v: ProdutoInput[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const formatCurrencyInput = (val: string) => {
    const raw = val.replace(/\D/g, "");
    if (!raw) return undefined;
    return Number(raw) / 100;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("O nome do produto é obrigatório");
      return;
    }
    try {
      if (isEdit && initial) {
        await update.mutateAsync({ ...form, id: initial.id });
        toast.success("Produto atualizado");
      } else {
        await create.mutateAsync(form);
        toast.success("Produto cadastrado");
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err);
      toast.error("Erro ao salvar", { description: err?.message || "" });
    }
  };

  if (!open) return null;
  const saving = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-card border shadow-[var(--shadow-elevated)]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {isEdit ? "Editar Produto" : "Novo Produto"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isEdit ? "Atualize os detalhes no catálogo" : "Adicione um item ao seu catálogo"}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="size-8 grid place-items-center rounded-lg hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium">Nome do Produto *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Ex: Mesa de Jantar 6 Lugares"
            />
          </div>

          <div>
            <label className="text-xs font-medium">Preço (R$)</label>
            <input
              type="text"
              value={form.preco !== undefined && form.preco !== null ? (form.preco * 100).toString().padStart(3, "0").replace(/(\d)(\d{2})$/, "$1,$2").replace(/(?=(\d{3})+(\D))\B/g, ".") : ""}
              onChange={(e) => set("preco", formatCurrencyInput(e.target.value))}
              className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="text-xs font-medium">Descrição</label>
            <textarea
              value={form.descricao || ""}
              onChange={(e) => set("descricao", e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Detalhes, material, dimensões..."
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
              {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar ao catálogo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
