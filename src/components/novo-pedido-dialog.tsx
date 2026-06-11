import { useCallback, useEffect, useMemo, useState, useRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Paperclip, FileText, Trash2, Plus, Search, Check } from "lucide-react";
import { toast } from "sonner";
import { ETAPAS, PRIORIDADE_LABEL, moeda, type StatusEtapa } from "@/lib/mock-data";
import { useCreatePedido, useUpdatePedido, type NovoPedidoInput } from "@/hooks/use-pedidos";
import { ClienteAutocomplete } from "@/components/cliente-autocomplete";
import { ClienteDialog } from "@/components/cliente-dialog";
import { supabase } from "@/integrations/supabase/client";

// ─── Funções puras fora do componente — não são recriadas a cada render ───────

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

/** Aplica a máscara de telefone celular brasileiro: (XX) XXXXX-XXXX */
function applyPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Formata altura, largura e profundidade em cm no padrão AxLxP */
function formatMedidas(altura: string, largura: string, profundidade: string): string {
  if (!altura && !largura && !profundidade) return "";
  
  const toCmStr = (valStr: string) => {
    const val = parseFloat(valStr.replace(",", "."));
    if (isNaN(val)) return valStr;
    if (val < 10) {
      return Math.round(val * 100).toString();
    }
    return Math.round(val).toString();
  };
  
  const a = toCmStr(altura || "0");
  const l = toCmStr(largura || "0");
  const p = toCmStr(profundidade || "0");
  
  return `${a}x${l}x${p}`;
}

/** Tenta extrair medidas de uma string de descrição legado */
function parseLegacyMedidas(desc: string): string {
  const clean = desc.trim();
  const parts = clean.split(/\s*[x×*]\s*/);
  if (parts.length === 3) {
    const p0 = parseFloat(parts[0].replace(",", "."));
    const p1 = parseFloat(parts[1].replace(",", "."));
    const p2 = parseFloat(parts[2].replace(",", "."));
    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      const toCmStr = (v: number) => (v < 10 ? Math.round(v * 100).toString() : Math.round(v).toString());
      // No formato legado "Largura x Profundidade x Altura" (Ex: 1.20×0.90×0.80):
      // Altura = p2, Largura = p0, Profundidade = p1
      return `${toCmStr(p2)}x${toCmStr(p0)}x${toCmStr(p1)}`;
    }
  }
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────

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
  desconto: 0,
  forma_pagamento: "Pix",
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

interface ItemRow {
  descricao: string;
  material: string;
  medidas: string;
  valor: number;
  quantidade: number;
  searchQuery?: string;
}

type EditState = (Partial<NovoPedidoInput> & { id?: string }) | null;

interface FormErrors {
  cliente_nome?: string;
  valor_total?: string;
  endereco?: string;
}

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

  const initialForm = useMemo<NovoPedidoInput>(
    () => (initial ? { ...EMPTY_FORM, ...initial } : EMPTY_FORM),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initial?.id]
  );

  const initialObsAdicionais = useMemo(() => {
    let obsAdicionais = initial?.observacoes || "";
    if (initial?.observacoes && initial.observacoes.includes("===JSON_ITENS===")) {
      try {
        const parts = initial.observacoes.split("===JSON_ITENS===\n");
        if (parts.length > 1) {
          obsAdicionais = parts[0].replace(/\n*Itens do Pedido:\n[\s\S]*$/, "").trim();
        }
      } catch {}
    }
    return obsAdicionais;
  }, [initial]);

  const initialItems = useMemo<ItemRow[]>(() => {
    let parsedItems: ItemRow[] = [];
    if (initial?.observacoes && initial.observacoes.includes("===JSON_ITENS===")) {
      try {
        const parts = initial.observacoes.split("===JSON_ITENS===\n");
        if (parts.length > 1) {
          const jsonPart = parts[1].split("\n===END_JSON_ITENS===")[0];
          parsedItems = JSON.parse(jsonPart);
        }
      } catch {}
    }
    if (parsedItems.length === 0) {
      parsedItems = [{
        descricao: initial?.produto || "",
        material: initial?.material || "",
        medidas: "",
        valor: 0,
        quantidade: 1,
        searchQuery: initial?.produto || ""
      }];
    } else {
      parsedItems = parsedItems.map((item) => ({
        ...item,
        quantidade: item.quantidade || 1,
        searchQuery: item.descricao || ""
      }));
    }
    return parsedItems;
  }, [initial]);

  const [form, setForm] = useState<NovoPedidoInput>(initialForm);
  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const [observacoesAdicionais, setObservacoesAdicionais] = useState(initialObsAdicionais);
  const [errors, setErrors] = useState<FormErrors>({});
  const [novoCliente, setNovoCliente] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  // States and refs for Product suggestion portal
  const [activeItemSuggestIndex, setActiveItemSuggestIndex] = useState<number | null>(null);
  const [productSuggestCoords, setProductSuggestCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const productInputRefs = useRef<(HTMLDivElement | null)[]>([]);

  const productSuggestions = useMemo(() => {
    if (activeItemSuggestIndex === null) return [];
    const query = items[activeItemSuggestIndex]?.searchQuery?.trim().toLowerCase() || "";
    if (!query) return catalogo.slice(0, 5);
    return catalogo
      .filter((c) => c.nome.toLowerCase().includes(query))
      .slice(0, 5);
  }, [catalogo, items, activeItemSuggestIndex]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('[data-product-suggest-portal="true"]') &&
        !target.closest('input[placeholder="Buscar por produto..."]')
      ) {
        setActiveItemSuggestIndex(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (activeItemSuggestIndex === null) return;
    const updatePosition = () => {
      const anchor = productInputRefs.current[activeItemSuggestIndex];
      if (anchor) {
        const rect = anchor.getBoundingClientRect();
        const dropdownHeight = 200; // max-h-48 is 192px
        const spaceBelow = window.innerHeight - rect.bottom;
        const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
        
        setProductSuggestCoords({
          top: showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [activeItemSuggestIndex]);

  const grossSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantidade || 1) * Number(item.valor || 0)), 0);
  }, [items]);

  const netTotal = useMemo(() => {
    return Math.max(0, grossSubtotal - Number(form.desconto || 0));
  }, [grossSubtotal, form.desconto]);

  useEffect(() => {
    setForm((s) => ({ ...s, valor_total: netTotal }));
    if (netTotal > 0) {
      setErrors((er) => ({ ...er, valor_total: undefined }));
    }
  }, [netTotal]);

  useEffect(() => {
    async function fetchCatalogo() {
      try {
        const { data, error } = await supabase.from("catalogo_produtos").select("*").order("nome");
        if (error) throw error;
        setCatalogo(data || []);
      } catch {
        // catálogo é opcional — falha silenciosa
      }
    }
    if (open) fetchCatalogo();
  }, [open]);

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

        const {
          data: { publicUrl },
        } = supabase.storage.from("anexos-pedidos").getPublicUrl(filePath);

        newUrls.push(publicUrl);
        toast.success(`Upload concluído: ${file.name}`);
      } catch (err: any) {
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

  const addItem = () => {
    setItems((prev) => [...prev, { descricao: "", material: "", medidas: "", valor: 0, quantidade: 1, searchQuery: "" }]);
  };

  const updateItem = (idx: number, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
    productInputRefs.current = productInputRefs.current.filter((_, i) => i !== idx);
    if (activeItemSuggestIndex === idx) {
      setActiveItemSuggestIndex(null);
    } else if (activeItemSuggestIndex !== null && activeItemSuggestIndex > idx) {
      setActiveItemSuggestIndex(activeItemSuggestIndex - 1);
    }
  };

  useEffect(() => {
    async function fetchFormaPagamento() {
      if (isEdit && initial?.id) {
        try {
          // Try to fetch by exact observation first
          let { data, error } = await supabase
            .from("pagamentos")
            .select("forma")
            .eq("pedido_id", initial.id)
            .eq("observacao", "Pagamento inicial / entrada")
            .maybeSingle();

          if (!error && data?.forma) {
            setForm((s) => ({ ...s, forma_pagamento: data.forma ?? undefined }));
          } else if (!error) {
            // Fallback: get the oldest payment for this order
            const { data: oldestData, error: fallbackError } = await supabase
              .from("pagamentos")
              .select("forma")
              .eq("pedido_id", initial.id)
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();

            if (!fallbackError && oldestData?.forma) {
              setForm((s) => ({ ...s, forma_pagamento: oldestData.forma ?? undefined }));
            }
          }
        } catch (err) {
          console.error("Erro ao buscar forma de pagamento:", err);
        }
      }
    }

    if (open) {
      setForm(initialForm);
      setItems(initialItems);
      setObservacoesAdicionais(initialObsAdicionais);
      setErrors({});
      setCurrentStep(1);
      fetchFormaPagamento();
    }
  }, [open, initialForm, initialItems, initialObsAdicionais, isEdit, initial?.id]);

  const isDirty = useMemo(() => {
    const formChanged = JSON.stringify({ ...form, observacoes: "" }) !== JSON.stringify({ ...initialForm, observacoes: "" });
    const itemsChanged = JSON.stringify(items) !== JSON.stringify(initialItems);
    const obsChanged = observacoesAdicionais.trim() !== initialObsAdicionais.trim();
    return formChanged || itemsChanged || obsChanged;
  }, [form, initialForm, items, initialItems, observacoesAdicionais, initialObsAdicionais]);

  const handleClose = useCallback(() => {
    if (isDirty && !window.confirm("Você tem dados não salvos. Deseja fechar mesmo assim?")) return;
    onOpenChange(false);
  }, [isDirty, onOpenChange]);

  const restante = Math.max(0, (form.valor_total || 0) - (form.valor_pago || 0));
  const set = <K extends keyof NovoPedidoInput>(k: K, v: NovoPedidoInput[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  /** Valida campos obrigatórios e retorna true se o formulário é válido */
  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.cliente_nome?.trim()) {
      errs.cliente_nome = "Campo obrigatório";
    }
    if (!form.valor_total || Number(form.valor_total) <= 0) {
      errs.valor_total = "Campo obrigatório";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!form.cliente_nome?.trim()) {
        setErrors((er) => ({ ...er, cliente_nome: "Campo obrigatório" }));
        toast.error("Por favor, preencha o nome do cliente.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const hasEmptyDescription = items.some((item) => !item.descricao.trim());
      if (hasEmptyDescription) {
        toast.error("Por favor, preencha a descrição de todos os itens do pedido.");
        return;
      }
      const filledItems = items.filter((item) => item.descricao.trim() !== "");
      if (filledItems.length === 0) {
        toast.error("Adicione pelo menos um produto com descrição.");
        return;
      }
      setCurrentStep(3);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (saving || isUploading) return;

    if (currentStep < 3) {
      handleNextStep();
      return;
    }

    if (!form.cliente_nome?.trim()) {
      setCurrentStep(1);
      setErrors((er) => ({ ...er, cliente_nome: "Campo obrigatório" }));
      toast.error("Por favor, preencha o nome do cliente.");
      return;
    }

    const hasEmptyDescription = items.some((item) => !item.descricao.trim());
    if (hasEmptyDescription) {
      setCurrentStep(2);
      toast.error("Por favor, preencha a descrição de todos os itens do pedido.");
      return;
    }

    const filledItems = items.filter((item) => item.descricao.trim() !== "");
    if (filledItems.length === 0) {
      setCurrentStep(2);
      toast.error("Adicione pelo menos um produto com descrição.");
      return;
    }

    if (!form.valor_total || Number(form.valor_total) <= 0) {
      setCurrentStep(3);
      setErrors((er) => ({ ...er, valor_total: "Campo obrigatório" }));
      toast.error("Por favor, informe o valor total do pedido.");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalClienteId = form.cliente_id;

      if (!finalClienteId && form.cliente_nome?.trim()) {
        const { data: newCliente, error: clienteError } = await supabase
          .from("clientes")
          .insert({
            nome: form.cliente_nome.trim(),
            telefone: form.telefone,
            email: form.email,
            cidade: form.cidade,
            cpf: form.cpf,
            cep: form.cep,
            endereco: form.endereco,
            numero: form.numero_endereco,
            complemento: form.complemento,
            bairro: form.bairro,
            instagram: form.instagram,
            origem: form.origem,
          })
          .select("id")
          .single();

        if (clienteError) {
          throw new Error(`Erro ao cadastrar cliente: ${clienteError.message}`);
        }
        finalClienteId = newCliente.id;
        set("cliente_id", finalClienteId);
      } else if (!finalClienteId && !form.cliente_nome?.trim()) {
        toast.error("Por favor, selecione ou informe o nome de um cliente.");
        setIsSubmitting(false);
        return;
      }

      // Format product and material strings by combining descriptions
      const produtoString = items.map((i) => i.descricao.trim()).filter(Boolean).join(", ");
      const materialString = items.map((i) => i.material.trim()).filter(Boolean).join(", ") || undefined;

      // Construct formatted observations with JSON suffix
      const itemsText = items
        .map((item, index) => {
          const matPart = item.material ? ` (${item.material})` : "";
          const medPart = item.medidas ? ` - Medidas: ${item.medidas}` : "";
          const qtdPart = item.quantidade && item.quantidade > 1 ? ` (Qtd: ${item.quantidade})` : "";
          const valPart = item.valor > 0 ? ` - R$ ${item.valor.toFixed(2)}` : "";
          return `${index + 1}. ${item.descricao}${qtdPart}${matPart}${medPart}${valPart}`;
        })
        .join("\n");

      const finalObs = `${observacoesAdicionais.trim()}${
        observacoesAdicionais.trim() ? "\n\n" : ""
      }Itens do Pedido:\n${itemsText}\n\n===JSON_ITENS===\n${JSON.stringify(items)}\n===END_JSON_ITENS===`;

      const payload = {
        ...form,
        cliente_id: finalClienteId,
        produto: produtoString || "Produto não informado",
        material: materialString,
        observacoes: finalObs,
      };

      if (isEdit) {
        await update.mutateAsync({ ...payload, id: initial!.id as string });
        toast.success("Pedido atualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Pedido criado com sucesso");
      }
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message || err?.details || JSON.stringify(err);
      toast.error("Não foi possível salvar", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;
  const saving = create.isPending || update.isPending || isSubmitting;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm md:p-4 overflow-hidden">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full md:h-auto max-h-[90vh] md:max-h-[85vh] md:max-w-3xl md:rounded-2xl bg-card border shadow-[var(--shadow-elevated)] flex flex-col md:my-8"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {isEdit ? "Editar pedido" : "Novo pedido"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isEdit ? "Atualize os dados do pedido" : "Cadastre um novo pedido na produção"}
            </p>
          </div>
          <button type="button" onClick={handleClose} className="size-8 grid place-items-center rounded-lg hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-5 py-2.5 border-b bg-muted/20">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) setCurrentStep(1);
              }}
              className="flex flex-col items-center gap-1 flex-1 relative focus:outline-none"
            >
              <div className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                currentStep >= 1
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-muted"
              }`}>
                1
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                currentStep >= 1 ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}>
                Cliente
              </span>
            </button>
            {/* Connector Line 1-2 */}
            <div className={`h-[2px] flex-1 -mt-4 transition-colors ${
              currentStep >= 2 ? "bg-primary" : "bg-muted"
            }`} />
            {/* Step 2 */}
            <button
              type="button"
              onClick={() => {
                if (currentStep > 2) {
                  setCurrentStep(2);
                } else if (currentStep === 1 && form.cliente_nome?.trim()) {
                  setCurrentStep(2);
                }
              }}
              className="flex flex-col items-center gap-1 flex-1 relative focus:outline-none"
            >
              <div className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                currentStep >= 2
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-muted"
              }`}>
                2
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                currentStep >= 2 ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}>
                Itens
              </span>
            </button>
            {/* Connector Line 2-3 */}
            <div className={`h-[2px] flex-1 -mt-4 transition-colors ${
              currentStep >= 3 ? "bg-primary" : "bg-muted"
            }`} />
            {/* Step 3 */}
            <button
              type="button"
              onClick={() => {
                if (form.cliente_nome?.trim()) {
                  const filledItems = items.filter((item) => item.descricao.trim() !== "");
                  if (filledItems.length > 0) {
                    setCurrentStep(3);
                  }
                }
              }}
              className="flex flex-col items-center gap-1 flex-1 relative focus:outline-none"
            >
              <div className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                currentStep === 3
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-muted"
              }`}>
                3
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                currentStep === 3 ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}>
                Finalização
              </span>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="px-5 py-3.5 space-y-3 flex-1 overflow-y-auto pr-1">
          {currentStep === 1 && (
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
                        telefone: c?.telefone ? applyPhoneMask(c.telefone) : "",
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

              <div className="md:col-span-2 space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Nome do cliente — obrigatório */}
                  <div>
                    <label className="text-xs font-medium">Nome do cliente *</label>
                    <input
                      type="text"
                      value={form.cliente_nome}
                      onChange={(e) => {
                        set("cliente_nome", e.target.value);
                        if (e.target.value.trim()) setErrors((er) => ({ ...er, cliente_nome: undefined }));
                      }}
                      className={`mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 ${
                        errors.cliente_nome ? "border-destructive ring-1 ring-destructive/40" : ""
                      }`}
                    />
                    {errors.cliente_nome && (
                      <p className="mt-1 text-xs text-destructive">{errors.cliente_nome}</p>
                    )}
                  </div>
                  <Field label="CPF / CNPJ" value={form.cpf || ""} onChange={(v) => set("cpf", v)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Telefone com máscara */}
                  <div>
                    <label className="text-xs font-medium">Telefone</label>
                    <input
                      type="tel"
                      value={form.telefone || ""}
                      onChange={(e) => set("telefone", applyPhoneMask(e.target.value))}
                      placeholder="(XX) XXXXX-XXXX"
                      maxLength={15}
                      className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                  <Field label="E-mail" type="email" value={form.email || ""} onChange={(v) => set("email", v)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <Field
                    label="Instagram"
                    value={form.instagram || ""}
                    onChange={(v) => set("instagram", v)}
                    placeholder="@usuario"
                  />
                  <div>
                    <label className="text-xs font-medium">Origem</label>
                    <select
                      value={form.origem || ""}
                      onChange={(e) => set("origem", e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <Field label="CEP" value={form.cep || ""} onChange={(v) => set("cep", v)} />
                  {/* Endereço — opcional */}
                  <div className="col-span-2">
                    <label className="text-xs font-medium">Endereço / Rua</label>
                    <input
                      type="text"
                      value={form.endereco || ""}
                      onChange={(e) => set("endereco", e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                  <Field
                    label="Número"
                    value={form.numero_endereco || ""}
                    onChange={(v) => set("numero_endereco", v)}
                  />
                  <div className="col-span-3">
                    <Field
                      label="Complemento"
                      value={form.complemento || ""}
                      onChange={(v) => set("complemento", v)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
          )}

          {currentStep === 2 && (
            <>
              <Section title="Itens do Pedido">
                <div className="col-span-1 md:col-span-2 space-y-2.5">
                  {items.map((item, idx) => (
                    <div key={idx} className="border border-slate-200 dark:border-border/40 bg-slate-50/50 dark:bg-muted/10 p-3 rounded-xl mb-3 relative">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="absolute top-3 right-3 size-8 inline-flex items-center justify-center rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors z-10"
                          title="Remover item"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}

                      {/* Product Autocomplete Search Bar */}
                      <div className="mb-3 pr-9">
                        <label className="text-xs font-medium text-muted-foreground">Buscar no Catálogo</label>
                        <div
                          ref={(el) => {
                            productInputRefs.current[idx] = el;
                          }}
                          className="mt-1 relative"
                        >
                          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            value={item.searchQuery || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateItem(idx, "searchQuery", val);
                              setActiveItemSuggestIndex(idx);
                            }}
                            onFocus={() => {
                              setActiveItemSuggestIndex(idx);
                            }}
                            placeholder="Buscar por produto..."
                            className="w-full h-9 pl-9 pr-8 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          />
                          {(item.searchQuery || item.descricao) && (
                            <Check className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-success" />
                          )}
                        </div>
                      </div>

                      {/* Inner Fields Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <div className="md:col-span-2">
                          <label className="text-xs font-medium">Descrição do Móvel / Projeto *</label>
                          <input
                            type="text"
                            required
                            value={item.descricao}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateItem(idx, "descricao", val);
                              updateItem(idx, "searchQuery", val);
                            }}
                            placeholder="Ex: Armário de cozinha"
                            className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium">Material principal</label>
                          <input
                            type="text"
                            value={item.material}
                            onChange={(e) => updateItem(idx, "material", e.target.value)}
                            placeholder="Ex: MDF Branco"
                            className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium">Medidas (AxLxP)</label>
                          <input
                            type="text"
                            value={item.medidas}
                            onChange={(e) => updateItem(idx, "medidas", e.target.value)}
                            placeholder="Ex: 80x120x60"
                            className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium">Qtd</label>
                          <input
                            type="number"
                            min="1"
                            defaultValue={1}
                            value={item.quantidade || 1}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                              updateItem(idx, "quantidade", val);
                            }}
                            className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 text-center"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium">Valor do Item (R$)</label>
                          <CurrencyInput
                            value={item.valor}
                            onChange={(val) => {
                              updateItem(idx, "valor", val);
                            }}
                            placeholder="R$ 0,00"
                            className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Suggestions list is now rendered dynamically via portal context */}
                  <button
                    type="button"
                    onClick={addItem}
                    className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="size-3.5" />
                    Adicionar outro produto
                  </button>
                </div>
              </Section>

              <Section title="Informações Adicionais">
                <div className="col-span-1 md:col-span-2">
                  <label className="text-xs font-medium">Observações gerais do pedido</label>
                  <textarea
                    value={observacoesAdicionais}
                    onChange={(e) => setObservacoesAdicionais(e.target.value)}
                    rows={2}
                    className="mt-1 w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                    placeholder="Detalhes adicionais, observações de montagem, etc."
                  />
                </div>
              </Section>
            </>
          )}

          {currentStep === 3 && (
            <>
              <Section title="Entrega & Status">
                <Field
                  label="Data estimada de entrega"
                  type="date"
                  value={form.entrega || ""}
                  onChange={(v) => set("entrega", v)}
                />
                <SelectField
                  label="Prioridade"
                  value={form.prioridade}
                  onChange={(v) => set("prioridade", v as NovoPedidoInput["prioridade"])}
                >
                  {(["baixa", "media", "alta", "urgente"] as const).map((p) => (
                    <option key={p} value={p}>
                      {PRIORIDADE_LABEL[p]}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Etapa"
                  value={form.etapa}
                  onChange={(v) => set("etapa", v as StatusEtapa)}
                >
                  {ETAPAS.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </SelectField>
              </Section>

              <Section title="Financeiro">
                {/* Valor total — obrigatório, sem negativos */}
                <div>
                  <label className="text-xs font-medium">Valor total *</label>
                  <CurrencyInput
                    value={form.valor_total}
                    onChange={(v) => {
                      set("valor_total", v);
                      if (v > 0) setErrors((er) => ({ ...er, valor_total: undefined }));
                    }}
                    placeholder="R$ 0,00"
                    className={`mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 ${
                      errors.valor_total ? "border-destructive ring-1 ring-destructive/40" : ""
                    }`}
                  />
                  {errors.valor_total && (
                    <p className="mt-1 text-xs text-destructive">{errors.valor_total}</p>
                  )}
                </div>

                {/* Desconto */}
                <div>
                  <label className="text-xs font-medium">Desconto (R$)</label>
                  <CurrencyInput
                    value={form.desconto || 0}
                    onChange={(v) => {
                      set("desconto", v);
                    }}
                    placeholder="R$ 0,00"
                    className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>

                {/* Valor pago — sem negativos */}
                <div>
                  <label className="text-xs font-medium">Valor pago / entrada</label>
                  <CurrencyInput
                    value={form.valor_pago}
                    onChange={(val) => {
                      set("valor_pago", val);
                      if (val > 0 && !form.forma_pagamento) {
                        set("forma_pagamento", "Pix");
                      }
                    }}
                    placeholder="R$ 0,00"
                    className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>

                {Number(form.valor_pago || 0) > 0 && (
                  <div>
                    <label className="text-xs font-medium font-semibold">Forma de pagamento (Entrada) *</label>
                    <select
                      value={form.forma_pagamento || "Pix"}
                      onChange={(e) => set("forma_pagamento", e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                    </select>
                  </div>
                )}

                <div className="md:col-span-2 rounded-lg border bg-muted/40 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Saldo restante (calculado)</span>
                  <span className="text-lg font-semibold tabular-nums">{moeda(restante)}</span>
                </div>
              </Section>

              <Section title="Anexos do Projeto (Fotos / PDFs)">
                <div className="md:col-span-2 space-y-3">
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
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
                      <div className="space-y-1.5">
                        <div className="mx-auto size-8 rounded-full bg-accent flex items-center justify-center">
                          <Paperclip className="size-4 text-muted-foreground" />
                        </div>
                        <div className="text-xs">
                          <span className="font-semibold text-primary">Clique para anexar</span> ou arraste arquivos aqui
                        </div>
                        <p className="text-[10px] text-muted-foreground">Imagens (JPG, PNG) and PDFs (Máx 10MB)</p>
                      </div>
                    )}
                  </div>

                  {form.anexos && form.anexos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                      {form.anexos.map((url, idx) => {
                        const isImg = isImageUrl(url);
                        const name = getFileNameFromUrl(url);
                        return (
                          <div
                            key={idx}
                            className="relative group rounded-xl border bg-card overflow-hidden aspect-video flex flex-col items-center justify-center p-2 shadow-sm"
                          >
                            {isImg ? (
                              <img src={url} alt="Anexo" className="w-full h-full object-cover rounded-lg" />
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
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="h-9 px-4 rounded-lg border text-sm hover:bg-accent"
              >
                Voltar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="h-9 px-4 rounded-lg border text-sm hover:bg-accent"
              >
                Cancelar
              </button>
            )}

            {currentStep === 1 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleNextStep();
                }}
                className="h-9 px-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Avançar
              </button>
            ) : currentStep === 2 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentStep(3);
                }}
                className="h-9 px-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Avançar
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving || isUploading}
                className="h-9 px-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {(saving || isUploading) && <Loader2 className="size-4 animate-spin" />}
                {isUploading
                  ? "Enviando arquivos..."
                  : saving
                  ? "Salvando..."
                  : isEdit
                  ? "Salvar alterações"
                  : "Criar pedido"}
              </button>
            )}
          </div>
        </form>
      </div>

      {activeItemSuggestIndex !== null && productSuggestCoords && createPortal(
        <div
          data-product-suggest-portal="true"
          style={{
            position: "fixed",
            top: `${productSuggestCoords.top}px`,
            left: `${productSuggestCoords.left}px`,
            width: `${productSuggestCoords.width}px`,
            zIndex: 9999,
          }}
          className="rounded-lg border bg-popover shadow-[var(--shadow-elevated)] max-h-48 overflow-y-auto"
        >
          {productSuggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Nenhum produto no catálogo
            </div>
          ) : (
            <ul className="py-1">
              {productSuggestions.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const idx = activeItemSuggestIndex;
                      updateItem(idx, "descricao", c.nome);
                      updateItem(idx, "material", c.material || "");
                      updateItem(idx, "valor", c.preco ? Number(c.preco) : items[idx].valor);
                      updateItem(idx, "searchQuery", c.nome);
                      
                      // Auto-fill measures
                      let measuresStr = "";
                      if (c.descricao) {
                        if (c.descricao.includes("===JSON_MEDIDAS===")) {
                          try {
                            const parts = c.descricao.split("===JSON_MEDIDAS===\n");
                            if (parts.length > 1) {
                              const jsonPart = parts[1].split("\n===END_JSON_MEDIDAS===")[0];
                              const parsed = JSON.parse(jsonPart);
                              measuresStr = formatMedidas(parsed.altura, parsed.largura, parsed.profundidade);
                            }
                          } catch {}
                        } else {
                          measuresStr = parseLegacyMedidas(c.descricao);
                        }
                      }
                      if (measuresStr) {
                        updateItem(idx, "medidas", measuresStr);
                      }
                      setActiveItemSuggestIndex(null);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      const idx = activeItemSuggestIndex;
                      updateItem(idx, "descricao", c.nome);
                      updateItem(idx, "material", c.material || "");
                      updateItem(idx, "valor", c.preco ? Number(c.preco) : items[idx].valor);
                      updateItem(idx, "searchQuery", c.nome);
                      
                      // Auto-fill measures
                      let measuresStr = "";
                      if (c.descricao) {
                        if (c.descricao.includes("===JSON_MEDIDAS===")) {
                          try {
                            const parts = c.descricao.split("===JSON_MEDIDAS===\n");
                            if (parts.length > 1) {
                              const jsonPart = parts[1].split("\n===END_JSON_MEDIDAS===")[0];
                              const parsed = JSON.parse(jsonPart);
                              measuresStr = formatMedidas(parsed.altura, parsed.largura, parsed.profundidade);
                            }
                          } catch {}
                        } else {
                          measuresStr = parseLegacyMedidas(c.descricao);
                        }
                      }
                      if (measuresStr) {
                        updateItem(idx, "medidas", measuresStr);
                      }
                      setActiveItemSuggestIndex(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                  >
                    <p className="font-medium truncate">{c.nome}</p>
                    {c.material && (
                      <p className="text-xs text-muted-foreground truncate">{c.material}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>,
        document.body
      )}

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
                telefone: data.telefone ? applyPhoneMask(data.telefone) : "",
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
          } catch {
            setForm((s) => ({ ...s, cliente_id: id, cliente_nome: novoCliente ?? s.cliente_nome }));
          }
          setNovoCliente(null);
          toast.success("Cliente vinculado ao pedido");
        }}
      />
    </div>
  );
}

// ─── Sub-componentes locais ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
      >
        {children}
      </select>
    </div>
  );
}

function CurrencyInput({
  value,
  onChange,
  className,
  placeholder,
  id,
}: {
  value: number | null | undefined;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}) {
  const [displayValue, setDisplayValue] = useState("");

  const formatNumberToBRL = (val: number | null | undefined): string => {
    const num = Number(val || 0);
    if (num === 0) return "";
    return num.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const maskBRL = (val: string): string => {
    let clean = val.replace(/[^\d,]/g, "");
    const parts = clean.split(",");
    let integerPart = parts[0] || "";
    let decimalPart = parts[1];

    if (integerPart) {
      const parsedInt = parseInt(integerPart.replace(/\D/g, ""), 10);
      if (!isNaN(parsedInt)) {
        integerPart = parsedInt.toLocaleString("pt-BR");
      } else {
        integerPart = "";
      }
    }

    if (decimalPart !== undefined) {
      decimalPart = decimalPart.slice(0, 2);
      return `R$ ${integerPart},${decimalPart}`;
    }

    return integerPart ? `R$ ${integerPart}` : "";
  };

  const parseBRLToNumber = (formatted: string): number => {
    if (!formatted) return 0;
    let clean = formatted.replace(/R\$\s?/g, "").replace(/\./g, "").trim();
    clean = clean.replace(",", ".");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    const currentNum = parseBRLToNumber(displayValue);
    if (currentNum !== (value || 0)) {
      setDisplayValue(formatNumberToBRL(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = maskBRL(raw);
    setDisplayValue(masked);
    const num = parseBRLToNumber(masked);
    onChange(num);
  };

  const handleBlur = () => {
    const num = Number(value || 0);
    if (num > 0) {
      setDisplayValue(formatNumberToBRL(value));
    } else {
      setDisplayValue("");
    }
  };

  return (
    <input
      type="text"
      id={id}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder || "R$ 0,00"}
      className={className}
    />
  );
}
