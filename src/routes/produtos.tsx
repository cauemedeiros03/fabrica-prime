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
  Camera,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/produtos")({
  component: ProdutosPage,
  head: () => ({ meta: [{ title: "Produtos · Sua bancada" }] }),
});

// ─── Funções utilitárias para dimensões/descrição ────────────────────────────────
function cleanDescription(desc: string | null | undefined): string {
  if (!desc) return "";
  return desc.split("===JSON_MEDIDAS===")[0].trim();
}

function parseLegacyMedidasToMeters(desc: string): { altura: string; largura: string; profundidade: string } {
  const clean = desc.trim();
  const parts = clean.split(/\s*[x×*]\s*/);
  if (parts.length === 3) {
    const p0 = parseFloat(parts[0].replace(",", "."));
    const p1 = parseFloat(parts[1].replace(",", "."));
    const p2 = parseFloat(parts[2].replace(",", "."));
    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      const formatToMeterStr = (v: number) => {
        if (v >= 10) return (v / 100).toFixed(2);
        return v.toFixed(2);
      };
      // For legacy format: "1.20×0.90×0.80" -> Largura x Profundidade x Altura
      // Altura = p2, Largura = p0, Profundidade = p1
      return {
        altura: formatToMeterStr(p2),
        largura: formatToMeterStr(p0),
        profundidade: formatToMeterStr(p1),
      };
    }
  }
  return { altura: "", largura: "", profundidade: "" };
}

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
        .select("id, nome, descricao, preco, tipo_movel, material, cor_acabamento, criado_em, imagem_url")
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
        cleanDescription(p.descricao).toLowerCase().includes(q)
    );
  }, [produtos, query]);

  const abrirEditar = (p: Produto) =>
    setEdit({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? "",
      preco: p.preco ?? undefined,
      tipo_movel: p.tipo_movel ?? "",
      material: p.material ?? "",
      cor_acabamento: p.cor_acabamento ?? "",
      imagem_url: p.imagem_url ?? "",
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
                {p.imagem_url ? (
                  <img src={p.imagem_url} alt={p.nome} className="size-10 rounded-xl object-cover shrink-0 bg-slate-100" />
                ) : (
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Package className="size-5" />
                  </div>
                )}
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
                <h3 className="font-semibold text-base tracking-tight line-clamp-2" title={p.nome}>{p.nome}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={cleanDescription(p.descricao)}>
                  {cleanDescription(p.descricao) || "Sem descrição"}
                </p>
                {(p.tipo_movel || p.material || p.cor_acabamento) && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.tipo_movel && (
                      <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {p.tipo_movel}
                      </span>
                    )}
                    {p.material && (
                      <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {p.material}
                      </span>
                    )}
                    {p.cor_acabamento && (
                      <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {p.cor_acabamento}
                      </span>
                    )}
                  </div>
                )}
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
        onSuccess={() => {
          fetchProdutos();
        }}
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
  onSuccess?: (item?: any) => void;
}) {
  const isEdit = !!initial;
  const create = useCreateProduto();
  const update = useUpdateProduto();

  const [form, setForm] = useState<ProdutoInput>({
    nome: "",
    descricao: "",
    preco: undefined,
    tipo_movel: "",
    material: "",
    cor_acabamento: "",
    imagem_url: "",
  });

  const [altura, setAltura] = useState("");
  const [largura, setLargura] = useState("");
  const [profundidade, setProfundidade] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          ...initial,
          imagem_url: initial.imagem_url || "",
        });
        // Extract dimensions
        const rawDesc = initial.descricao || "";
        if (rawDesc.includes("===JSON_MEDIDAS===")) {
          try {
            const parts = rawDesc.split("===JSON_MEDIDAS===\n");
            if (parts.length > 1) {
              setForm((prev) => ({ ...prev, descricao: parts[0].trim() }));
              const jsonPart = parts[1].split("\n===END_JSON_MEDIDAS===")[0];
              const parsed = JSON.parse(jsonPart);
              setAltura(parsed.altura || "");
              setLargura(parsed.largura || "");
              setProfundidade(parsed.profundidade || "");
            }
          } catch {
            setForm((prev) => ({ ...prev, descricao: rawDesc }));
            setAltura("");
            setLargura("");
            setProfundidade("");
          }
        } else {
          // Legacy check
          const legacy = parseLegacyMedidasToMeters(rawDesc);
          if (legacy.altura || legacy.largura || legacy.profundidade) {
            setForm((prev) => ({ ...prev, descricao: "" }));
          } else {
            setForm((prev) => ({ ...prev, descricao: rawDesc }));
          }
          setAltura(legacy.altura);
          setLargura(legacy.largura);
          setProfundidade(legacy.profundidade);
        }
      } else {
        setForm({
          nome: "",
          descricao: "",
          preco: undefined,
          tipo_movel: "",
          material: "",
          cor_acabamento: "",
          imagem_url: "",
        });
        setAltura("");
        setLargura("");
        setProfundidade("");
      }
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
      // Build final description with JSON metadata
      let finalDescricao = (form.descricao || "").trim();
      if (altura.trim() || largura.trim() || profundidade.trim()) {
        const metadataPart = `===JSON_MEDIDAS===\n${JSON.stringify({
          altura: altura.trim(),
          largura: largura.trim(),
          profundidade: profundidade.trim(),
        })}\n===END_JSON_MEDIDAS===`;
        finalDescricao = `${finalDescricao}${finalDescricao ? "\n\n" : ""}${metadataPart}`;
      }

      const payload = {
        ...form,
        descricao: finalDescricao || undefined,
      };

      if (isEdit && initial) {
        await update.mutateAsync({ ...payload, id: initial.id });
        toast.success("Produto atualizado");
        onSuccess?.({ ...payload, id: initial.id });
      } else {
        const id = await create.mutateAsync(payload);
        toast.success("Produto cadastrado");
        onSuccess?.({ ...payload, id, created_at: new Date().toISOString() });
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err);
      toast.error("Erro ao salvar", { description: err?.message || "" });
    }
  };

  if (!open) return null;
  const saving = create.isPending || update.isPending;

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas 2d context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Image compression failed"));
              }
            },
            "image/jpeg",
            0.7
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const file = files[0];
      const compressedBlob = await compressImage(file);
      
      const fileExt = "jpg";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("produtos")
        .upload(filePath, compressedBlob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("produtos").getPublicUrl(filePath);

      set("imagem_url", publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (err: any) {
      console.error("Erro ao enviar imagem:", err);
      toast.error("Erro ao enviar imagem", { description: err?.message || "" });
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm md:p-4 overflow-y-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full md:h-auto md:max-w-md md:rounded-2xl bg-card border shadow-[var(--shadow-elevated)] flex flex-col"
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

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4 flex-1 overflow-y-auto md:flex-none">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 hover:border-primary/50 transition cursor-pointer relative bg-slate-50/50 dark:bg-slate-900/50">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              id="product-image-upload"
              className="hidden"
              onChange={handleImageUpload}
            />
            <label htmlFor="product-image-upload" className="w-full flex flex-col items-center justify-center cursor-pointer">
              {uploadingImage ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Enviando imagem...</span>
                </div>
              ) : form.imagem_url ? (
                <div className="relative w-full flex items-center justify-center">
                  <img src={form.imagem_url} alt="Preview" className="h-28 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      set("imagem_url", "");
                    }}
                    className="absolute top-0 right-0 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-2">
                  <Camera className="size-6 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Tirar foto ou escolher imagem</span>
                </div>
              )}
            </label>
          </div>

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
            <label className="text-xs font-medium">Tipo do móvel</label>
            <input
              type="text"
              value={form.tipo_movel || ""}
              onChange={(e) => set("tipo_movel", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Ex: Cadeira, Mesa, Armário"
            />
          </div>

          <div>
            <label className="text-xs font-medium">Material</label>
            <input
              type="text"
              value={form.material || ""}
              onChange={(e) => set("material", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Ex: MDF, Angelim-pedra, Ferro"
            />
          </div>

          <div>
            <label className="text-xs font-medium">Cor / acabamento</label>
            <input
              type="text"
              value={form.cor_acabamento || ""}
              onChange={(e) => set("cor_acabamento", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Ex: Verniz fosco, Off-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium">Altura (m)</label>
              <input
                type="text"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="Ex: 0.80"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Largura (m)</label>
              <input
                type="text"
                value={largura}
                onChange={(e) => setLargura(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="Ex: 1.20"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Profundidade (m)</label>
              <input
                type="text"
                value={profundidade}
                onChange={(e) => setProfundidade(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="Ex: 0.90"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Descrição</label>
            <textarea
              value={form.descricao || ""}
              onChange={(e) => set("descricao", e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Detalhes, material..."
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
