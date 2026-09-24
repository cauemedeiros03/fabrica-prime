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

function parseMedidas(desc: string | null | undefined): { altura: string; largura: string; profundidade: string } {
  if (!desc) return { altura: "", largura: "", profundidade: "" };
  if (desc.includes("===JSON_MEDIDAS===")) {
    try {
      const parts = desc.split("===JSON_MEDIDAS===\n");
      if (parts.length > 1) {
        const jsonPart = parts[1].split("\n===END_JSON_MEDIDAS===")[0];
        const parsed = JSON.parse(jsonPart);
        return {
          altura: parsed.altura || "",
          largura: parsed.largura || "",
          profundidade: parsed.profundidade || "",
        };
      }
    } catch (e) {
      console.error("Erro ao fazer parse de medidas JSON:", e);
    }
  }
  return parseLegacyMedidasToMeters(desc);
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
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null); // State to handle the active product pop-up details modal

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
              onClick={() => setSelectedProduto(p)}
              className="group overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] transition flex flex-col h-full relative cursor-pointer"
            >
              {/* Imagem Banner com Proporção Preservada */}
              <div className="relative overflow-hidden w-full h-56 bg-muted/40 dark:bg-muted/20 border-b flex items-center justify-center p-3">
                {p.imagem_url ? (
                  <img
                    src={p.imagem_url}
                    alt={p.nome}
                    loading="lazy"
                    className="max-h-full max-w-full w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-[1.03] select-none"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50">
                    <Package className="size-9 stroke-[1.5]" />
                    <span className="text-[11px] font-medium">Sem imagem</span>
                  </div>
                )}

                {/* Ações (Desktop: Hover, Mobile: Fixo) */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirEditar(p);
                    }}
                    className="size-8 grid place-items-center rounded-lg border bg-background/90 backdrop-blur-sm text-foreground hover:bg-background transition shadow-sm"
                    aria-label="Editar"
                    title="Editar produto"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmar(p);
                    }}
                    className="size-8 grid place-items-center rounded-lg border border-destructive/30 bg-background/90 backdrop-blur-sm text-destructive hover:bg-destructive/10 transition shadow-sm"
                    aria-label="Remover"
                    title="Remover produto"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Informações */}
              <div className="p-5 flex-1 flex flex-col justify-between min-w-0">
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-semibold text-base tracking-tight line-clamp-2 text-foreground" title={p.nome}>
                    {p.nome}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2" title={cleanDescription(p.descricao)}>
                    {cleanDescription(p.descricao) || "Sem descrição"}
                  </p>
                  {(p.tipo_movel || p.material || p.cor_acabamento) && (
                    <div className="pt-1.5 flex flex-wrap gap-1">
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

      {/* MODAL DE DETALHES DO PRODUTO */}
      {selectedProduto && (() => {
        const medidas = parseMedidas(selectedProduto.descricao);
        const descPura = cleanDescription(selectedProduto.descricao);
        return (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setSelectedProduto(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-card border shadow-[var(--shadow-elevated)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Cabeçalho */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold tracking-tight">Detalhes do Produto</h2>
                <button
                  onClick={() => setSelectedProduto(null)}
                  className="size-8 grid place-items-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Imagem Banner */}
              <div className="w-full bg-muted/50 dark:bg-card flex items-center justify-center rounded-t-xl overflow-hidden p-4 min-h-[300px] max-h-[500px] border-b">
                {selectedProduto.imagem_url ? (
                  <img
                    src={selectedProduto.imagem_url}
                    alt={selectedProduto.nome}
                    className="w-auto h-auto max-w-full max-h-[460px] object-contain block mx-auto drop-shadow-sm"
                  />
                ) : (
                  <div className="w-full h-64 bg-muted/30 flex flex-col items-center justify-center gap-2">
                    <Package className="size-16 stroke-[1.5] text-muted-foreground/40" />
                    <span className="text-xs text-muted-foreground/60 font-medium">Sem imagem disponível</span>
                  </div>
                )}
              </div>

              {/* Conteúdo */}
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <h3 className="font-bold text-xl text-foreground tracking-tight">{selectedProduto.nome}</h3>
                  {descPura ? (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">
                      {descPura}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/60 italic mt-2">Sem descrição adicional</p>
                  )}
                </div>

                <div className="border rounded-xl overflow-hidden bg-muted/30">
                  <table className="w-full text-sm border-collapse text-left">
                    <tbody>
                      <tr className="border-b bg-muted/10">
                        <th className="px-4 py-2.5 font-medium text-muted-foreground w-1/3">Nome</th>
                        <td className="px-4 py-2.5 text-foreground font-medium">{selectedProduto.nome}</td>
                      </tr>
                      <tr className="border-b">
                        <th className="px-4 py-2.5 font-medium text-muted-foreground w-1/3">Preço</th>
                        <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          {selectedProduto.preco != null ? moeda(selectedProduto.preco) : "Sob consulta"}
                        </td>
                      </tr>
                      <tr className="border-b bg-muted/10">
                        <th className="px-4 py-2.5 font-medium text-muted-foreground">Tipo do Móvel</th>
                        <td className="px-4 py-2.5 text-foreground">{selectedProduto.tipo_movel || "-"}</td>
                      </tr>
                      <tr className="border-b">
                        <th className="px-4 py-2.5 font-medium text-muted-foreground">Material</th>
                        <td className="px-4 py-2.5 text-foreground">{selectedProduto.material || "-"}</td>
                      </tr>
                      <tr className="border-b bg-muted/10">
                        <th className="px-4 py-2.5 font-medium text-muted-foreground">Cor/Acabamento</th>
                        <td className="px-4 py-2.5 text-foreground">{selectedProduto.cor_acabamento || "-"}</td>
                      </tr>
                      <tr className="border-b">
                        <th className="px-4 py-2.5 font-medium text-muted-foreground">Altura</th>
                        <td className="px-4 py-2.5 text-foreground">{medidas.altura ? `${medidas.altura} m` : "-"}</td>
                      </tr>
                      <tr className="border-b bg-muted/10">
                        <th className="px-4 py-2.5 font-medium text-muted-foreground">Largura</th>
                        <td className="px-4 py-2.5 text-foreground">{medidas.largura ? `${medidas.largura} m` : "-"}</td>
                      </tr>
                      <tr>
                        <th className="px-4 py-2.5 font-medium text-muted-foreground">Profundidade</th>
                        <td className="px-4 py-2.5 text-foreground">{medidas.profundidade ? `${medidas.profundidade} m` : "-"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rodapé */}
              <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/30 border-t">
                <button
                  onClick={() => {
                    abrirEditar(selectedProduto);
                    setSelectedProduto(null);
                  }}
                  className="h-9 px-4 inline-flex items-center gap-2 rounded-lg border bg-card hover:bg-accent text-sm font-medium transition-colors"
                >
                  <Pencil className="size-3.5" /> Editar
                </button>
                <button
                  onClick={() => setSelectedProduto(null)}
                  className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          // Calculate pure aspect ratio without ANY center cropping or clipping
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context failed'));

          // Use exactly 5 arguments to draw the WHOLE image into the WHOLE canvas area (Zero clipping allowed)
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Serialization failed'));
              }
            },
            'image/jpeg',
            0.7 // 70% quality compression to reach ~100KB footprint cleanly
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
      const errMsg = err?.message || (typeof err === "string" ? err : JSON.stringify(err)) || "";
      if (errMsg.toLowerCase().includes("bucket not found")) {
        toast.error("Erro de Configuração", {
          description: "A pasta 'produtos' não foi localizada no Storage do Supabase. Por favor, crie o bucket público.",
          duration: 8000,
        });
      } else {
        toast.error("Erro ao enviar imagem", { description: errMsg });
      }
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 hover:border-primary/50 transition relative bg-slate-50/50 dark:bg-slate-900/50">

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        id="product-image-upload"
        className="hidden"
        onChange={handleImageUpload}
      />

      {uploadingImage ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">
            Enviando imagem...
          </span>
        </div>
      ) : form.imagem_url ? (
        <div className="relative w-full flex items-center justify-center">
          <img
            src={form.imagem_url}
            alt="Preview"
            className="h-32 max-w-full rounded-lg object-contain bg-muted/40 p-1"
          />

          <button
            type="button"
            onClick={() => set("imagem_url", "")}
            className="absolute top-0 right-0 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() =>
            document.getElementById("product-image-upload")?.click()
          }
          className="w-full flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="flex flex-col items-center gap-1.5 py-2">
            <Camera className="size-6 text-muted-foreground" />

            <span className="text-xs font-medium text-muted-foreground">
              Tirar foto ou escolher imagem
            </span>
          </div>
        </button>
      )}
    </div>
  );
}