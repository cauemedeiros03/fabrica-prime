import React, { useCallback, useEffect, useMemo, useState, useRef, forwardRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Loader2, Printer, MessageCircle, X, Search, Check, Trash2, Plus, Sofa } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { ClienteAutocomplete } from "@/components/cliente-autocomplete";
import { supabase } from "@/lib/supabase";
import { useReactToPrint } from "react-to-print";
import { moeda } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";


export interface Orcamento {
  id: string;
  criadoEm: string;
  cliente_id?: string | null;
  clienteNome: string;
  clienteTelefone: string;
  clienteCidade: string;
  produtoDescricao: string;
  produtoMaterial: string;
  produtoMedidas: string;
  valorSugerido: number;
  validadeDias: number;
  status?: "Pendente" | "Aprovado";
  desconto?: number;
  clienteCpfCnpj?: string;
  formaPagamento?: string;
  clienteEmail?: string;
  clienteEndereco?: string;
  observacoes?: string;
}

export interface ItemRow {
  descricao: string;
  material: string;
  medidas: string;
  valor: number;
  quantidade: number;
  searchQuery?: string;
  produto_id?: string;
  nome?: string;
  preco_unitario?: number;
  especificacoes_customizadas?: string;
  imagem_url?: string;
}

interface OrcamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Orcamento | null;
}

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

function parseLegacyMedidas(desc: string): string {
  const clean = desc.trim();
  const parts = clean.split(/\s*[x×*]\s*/);
  if (parts.length === 3) {
    const p0 = parseFloat(parts[0].replace(",", "."));
    const p1 = parseFloat(parts[1].replace(",", "."));
    const p2 = parseFloat(parts[2].replace(",", "."));
    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      const toCmStr = (v: number) => (v < 10 ? Math.round(v * 100).toString() : Math.round(v).toString());
      return `${toCmStr(p2)}x${toCmStr(p0)}x${toCmStr(p1)}`;
    }
  }
  return "";
}

export function OrcamentoDialog({ open, onOpenChange, initialData }: OrcamentoDialogProps) {
  const { user } = useAuth();

  const emptyForm = useMemo(() => ({
    cliente_id: "",
    clienteNome: "",
    clienteTelefone: "",
    clienteCidade: "",
    clienteCpfCnpj: "",
    clienteEmail: "",
    clienteEndereco: "",
    observacoes: "",
    produtoDescricao: "",
    produtoMaterial: "",
    produtoMedidas: "",
    valorSugerido: 0,
    validadeDias: 15,
    desconto: 0,
    formaPagamento: "À vista (Pix / Dinheiro)",
  }), []);

  const baseForm = useMemo(() => {
    let metaClienteId = "";
    let metaCpfCnpj = "";
    let metaFormaPagamento = "À vista (Pix / Dinheiro)";
    let metaEmail = "";
    let metaEndereco = "";
    let metaObservacoes = "";
    const desc = initialData?.produtoDescricao || "";
    if (desc.includes("===METADATA===")) {
      try {
        const parts = desc.split("===METADATA===\n");
        if (parts.length > 1) {
          const jsonPart = parts[1].split("\n===END_METADATA===")[0];
          const meta = JSON.parse(jsonPart);
          if (meta.cliente_id) metaClienteId = meta.cliente_id;
          if (meta.clienteCpfCnpj) metaCpfCnpj = meta.clienteCpfCnpj;
          if (meta.formaPagamento) metaFormaPagamento = meta.formaPagamento;
          if (meta.clienteEmail) metaEmail = meta.clienteEmail;
          if (meta.clienteEndereco) metaEndereco = meta.clienteEndereco;
          if (meta.observacoes) metaObservacoes = meta.observacoes;
        }
      } catch { }
    }

    return initialData ? ({
      cliente_id: initialData.cliente_id || metaClienteId || "",
      clienteNome: initialData.clienteNome || "",
      clienteTelefone: initialData.clienteTelefone || "",
      clienteCidade: initialData.clienteCidade || "",
      clienteCpfCnpj: initialData.clienteCpfCnpj || metaCpfCnpj || "",
      clienteEmail: initialData.clienteEmail || metaEmail || "",
      clienteEndereco: initialData.clienteEndereco || metaEndereco || "",
      observacoes: initialData.observacoes || metaObservacoes || "",
      produtoDescricao: initialData.produtoDescricao || "",
      produtoMaterial: initialData.produtoMaterial || "",
      produtoMedidas: initialData.produtoMedidas || "",
      valorSugerido: initialData.valorSugerido || 0,
      validadeDias: initialData.validadeDias || 15,
      desconto: initialData.desconto || 0,
      formaPagamento: initialData.formaPagamento || metaFormaPagamento || "À vista (Pix / Dinheiro)",
    }) : emptyForm;
  }, [initialData, emptyForm]);

  const [form, setForm] = useState(emptyForm);
  const [salvando, setSalvando] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [printData, setPrintData] = useState<Orcamento | null>(null);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<ItemRow[]>([]);

  // States and refs for Product suggestion portal
  const [activeItemSuggestIndex, setActiveItemSuggestIndex] = useState<number | null>(null);
  const [productSuggestCoords, setProductSuggestCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const productInputRefs = useRef<(HTMLDivElement | null)[]>([]);

  const initialItems = useMemo<ItemRow[]>(() => {
    let parsedItems: ItemRow[] = [];
    const desc = initialData?.produtoDescricao || "";
    if (desc.includes("===JSON_ITENS===")) {
      try {
        const parts = desc.split("===JSON_ITENS===\n");
        if (parts.length > 1) {
          const jsonPart = parts[1].split("\n===END_JSON_ITENS===")[0];
          parsedItems = JSON.parse(jsonPart);
        }
      } catch { }
    }
    if (parsedItems.length === 0) {
      parsedItems = [{
        descricao: initialData?.produtoDescricao || "",
        material: initialData?.produtoMaterial || "",
        medidas: initialData?.produtoMedidas || "",
        valor: initialData?.valorSugerido || 0,
        quantidade: 1,
        searchQuery: initialData?.produtoDescricao || ""
      }];
    }
    return parsedItems;
  }, [initialData]);

  const isDirty = useMemo(() =>
    form.clienteNome !== baseForm.clienteNome ||
    form.clienteTelefone !== baseForm.clienteTelefone ||
    form.clienteCidade !== baseForm.clienteCidade ||
    form.clienteCpfCnpj !== baseForm.clienteCpfCnpj ||
    form.clienteEmail !== baseForm.clienteEmail ||
    form.clienteEndereco !== baseForm.clienteEndereco ||
    form.observacoes !== baseForm.observacoes ||
    form.formaPagamento !== baseForm.formaPagamento ||
    Number(form.validadeDias) !== Number(baseForm.validadeDias) ||
    Number(form.desconto) !== Number(baseForm.desconto) ||
    JSON.stringify(items) !== JSON.stringify(initialItems),
    [form, baseForm, items, initialItems]
  );

  const handleClose = useCallback(() => {
    if (
      !salvoComSucesso &&
      isDirty &&
      !window.confirm("Você tem dados não salvos. Deseja fechar mesmo assim?")
    ) {
      return;
    }

    onOpenChange(false);
  }, [isDirty, onOpenChange, salvoComSucesso]);

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v) {
      handleClose();
    } else {
      onOpenChange(v);
    }
  }, [handleClose, onOpenChange]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => {
      setPrintData(null);
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      setSalvoComSucesso(false);
      setPrintData(null);
      setForm(baseForm);
      let parsedItems: ItemRow[] = [];
      const desc = initialData?.produtoDescricao || "";
      if (desc.includes("===JSON_ITENS===")) {
        try {
          const parts = desc.split("===JSON_ITENS===\n");
          if (parts.length > 1) {
            const jsonPart = parts[1].split("\n===END_JSON_ITENS===")[0];
            parsedItems = JSON.parse(jsonPart);
          }
        } catch { }
      }
      if (parsedItems.length === 0) {
        parsedItems = [{
          descricao: initialData?.produtoDescricao || "",
          material: initialData?.produtoMaterial || "",
          medidas: initialData?.produtoMedidas || "",
          valor: initialData?.valorSugerido || 0,
          quantidade: 1,
          searchQuery: initialData?.produtoDescricao || ""
        }];
      }
      setItems(parsedItems);
    }
  }, [open, baseForm, initialData]);

  useEffect(() => {
    async function loadConfig() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("configuracoes_marcenaria")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          setConfig(data);
        }
      } catch (err) {
        console.error("Erro ao buscar configurações:", err);
      }
    }
    if (open && user) {
      loadConfig();
    }
  }, [open, user]);

  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Debounced product suggestions search querying Supabase directly
  useEffect(() => {
    if (activeItemSuggestIndex === null) {
      setProductSuggestions([]);
      return;
    }

    const query = items[activeItemSuggestIndex]?.searchQuery || "";
    let active = true;

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);

      try {
        let qBuilder = supabase
          .from("catalogo_produtos")
          .select("*");

        const term = query.trim();

        if (term) {
          qBuilder = qBuilder.or(
            `nome.ilike.%${term}%,tipo_movel.ilike.%${term}%,material.ilike.%${term}%`
          );
        }

        const { data, error } = await qBuilder
          .order("nome")
          .limit(5);

        if (error) throw error;

        if (active) {
          setProductSuggestions(data || []);
        }
      } catch (err) {
        console.error("Erro ao buscar catálogo:", err);
      } finally {
        if (active) setLoadingSuggestions(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    activeItemSuggestIndex,
    items,
    activeItemSuggestIndex !== null
      ? items[activeItemSuggestIndex]?.searchQuery
      : null,
  ]);

  useEffect(() => {
  if (activeItemSuggestIndex === null) return;

  const updatePosition = () => {
    const anchor = productInputRefs.current[activeItemSuggestIndex];

    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const dropdownHeight = 200;
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove =
        spaceBelow < dropdownHeight && rect.top > dropdownHeight;

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

// FECHAR CATÁLOGO AO CLICAR FORA
useEffect(() => {
  if (activeItemSuggestIndex === null) return;

  const handleOutsidePointerDown = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null;

    if (!target) return;

    const clickedCatalog = target.closest(
      '[data-product-suggest-portal="true"]'
    );

    const clickedInput = target.closest(
      '[data-product-input="true"]'
    );

    if (!clickedCatalog && !clickedInput) {
      setActiveItemSuggestIndex(null);
      setProductSuggestCoords(null);
    }
  };

  document.addEventListener("pointerdown", handleOutsidePointerDown);

  return () => {
    document.removeEventListener("pointerdown", handleOutsidePointerDown);
  };
}, [activeItemSuggestIndex]);

  const calculatedTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantidade || 1) * Number(item.valor || 0)), 0);
  }, [items]);

  useEffect(() => {
    setForm((s) => ({ ...s, valorSugerido: calculatedTotal }));
  }, [calculatedTotal]);

  const set = (k: string, v: any) => {
    setForm((s) => ({ ...s, [k]: v }));
  };

  const updateItem = (idx: number, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { descricao: "", material: "", medidas: "", valor: 0, quantidade: 1, searchQuery: "" },
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
    productInputRefs.current = productInputRefs.current.filter((_, i) => i !== idx);
    if (activeItemSuggestIndex === idx) {
  setActiveItemSuggestIndex(null);
  setProductSuggestCoords(null);
}
  };

  const handleSelectProduct = (idx: number, c: any) => {
    let measuresStr = "";
    let cleanDesc = "";
    if (c.descricao) {
      if (c.descricao.includes("===JSON_MEDIDAS===")) {
        try {
          const parts = c.descricao.split("===JSON_MEDIDAS===\n");
          if (parts.length > 1) {
            const jsonPart = parts[1].split("\n===END_JSON_MEDIDAS===")[0];
            const parsed = JSON.parse(jsonPart);
            measuresStr = formatMedidas(parsed.altura, parsed.largura, parsed.profundidade);
          }
        } catch { }
      } else {
        measuresStr = parseLegacyMedidas(c.descricao);
      }
      cleanDesc = c.descricao.split("===JSON_MEDIDAS===")[0].trim();
    }

    const specsArr: string[] = [];
    if (cleanDesc) specsArr.push(cleanDesc);
    if (c.material) specsArr.push(`Material: ${c.material}`);
    if (c.cor_acabamento) specsArr.push(`Cor: ${c.cor_acabamento}`);
    if (measuresStr) specsArr.push(`Medidas: ${measuresStr}`);
    const especificacoesCustomizadas = specsArr.join(" | ") || c.tipo_movel || "";

    const unitPrice = c.preco ? Number(c.preco) : 0;

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        return {
          ...item,
          produto_id: c.id,
          nome: c.nome,
          descricao: c.nome,
          preco_unitario: unitPrice,
          valor: unitPrice > 0 ? unitPrice : item.valor,
          material: c.material || item.material || "",
          medidas: measuresStr || item.medidas || "",
          especificacoes_customizadas: especificacoesCustomizadas,
          imagem_url: c.imagem_url || "",
          searchQuery: c.nome,
        };
      })
    );
    setActiveItemSuggestIndex(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const isLoading = salvando;
    if (isLoading) return;
    const hasEmptyDesc = items.some((item) => !item.descricao?.trim());
    if (!form.clienteNome || hasEmptyDesc || form.valorSugerido <= 0) {
      toast.error("Preencha cliente, descrição de todos os itens e verifique os valores");
      return;
    }

    if (!user) {
  toast.error(
    "Sua sessão ainda não foi carregada. Aguarde alguns segundos e tente novamente."
  );
  return;
}

setSalvando(true);

    setSalvando(true);
    const isEdit = !!initialData;
    const budgetId = isEdit ? initialData.id : window.crypto.randomUUID();
    const createdDate = isEdit ? initialData.criadoEm : new Date().toISOString();
    const statusVal = isEdit ? (initialData.status || "Pendente") : "Pendente";

    const originalValue = Number(form.valorSugerido);
    const discountValue = Number(form.desconto || 0);
    const finalValue = Math.max(0, originalValue - discountValue);

    const sanitizedItems = items.map((item) => ({
      produto_id: item.produto_id || undefined,
      nome: item.nome || item.descricao?.trim() || "Item sem descrição",
      descricao: item.descricao?.trim() || item.nome || "Item sem descrição",
      preco_unitario: Number(item.preco_unitario ?? item.valor ?? 0),
      especificacoes_customizadas: item.especificacoes_customizadas || undefined,
      imagem_url: item.imagem_url || undefined,
      material: item.material?.trim() || "",
      medidas: item.medidas?.trim() || "",
      valor: Math.max(0, Number(item.valor || item.preco_unitario || 0)),
      quantidade: Math.max(1, Math.round(Number(item.quantidade)) || 1),
      searchQuery: item.searchQuery?.trim() || "",
    }));

    const produtoString = sanitizedItems.map((i) => i.descricao).filter(Boolean).join(", ");
    const materialString = sanitizedItems.map((i) => i.material).filter(Boolean).join(", ") || "";
    const medidasString = sanitizedItems.map((i) => i.medidas).filter(Boolean).join(", ") || "";

    const finalProdutoDescricao = `${produtoString} ===JSON_ITENS===\n${JSON.stringify(sanitizedItems)}\n===END_JSON_ITENS===\n===METADATA===\n${JSON.stringify({
      cliente_id: form.cliente_id || null,
      clienteCpfCnpj: form.clienteCpfCnpj,
      formaPagamento: form.formaPagamento,
      clienteEmail: form.clienteEmail,
      clienteEndereco: form.clienteEndereco,
      observacoes: form.observacoes,
    })}\n===END_METADATA===`;

    const novoOrcamento: Orcamento = {
      id: budgetId,
      criadoEm: createdDate,
      cliente_id: form.cliente_id || null,
      clienteNome: form.clienteNome,
      clienteTelefone: form.clienteTelefone,
      clienteCidade: form.clienteCidade,
      clienteCpfCnpj: form.clienteCpfCnpj,
      clienteEmail: form.clienteEmail,
      clienteEndereco: form.clienteEndereco,
      observacoes: form.observacoes,
      formaPagamento: form.formaPagamento,
      produtoDescricao: finalProdutoDescricao,
      produtoMaterial: materialString,
      produtoMedidas: medidasString,
      valorSugerido: originalValue,
      desconto: discountValue,
      validadeDias: Number(form.validadeDias),
      status: statusVal,
    };

    try {
      // 1. Salvar no localStorage
      const localList = JSON.parse(localStorage.getItem("orcamentos_salvos") || "[]");
      if (isEdit) {
        const index = localList.findIndex((o: any) => o.id === budgetId);
        if (index > -1) {
          localList[index] = novoOrcamento;
        } else {
          localList.unshift(novoOrcamento);
        }
      } else {
        localList.unshift(novoOrcamento);
      }
      localStorage.setItem("orcamentos_salvos", JSON.stringify(localList));

      // 2. Salvar no Supabase
if (isEdit) {
  const { error } = await (supabase as any)
    .from("orcamentos_salvos")
    .update({
      cliente_nome: form.clienteNome,
      cliente_telefone: form.clienteTelefone,
      cliente_cidade: form.clienteCidade,
      prospecto_nome: form.clienteNome,
      prospecto_telefone: form.clienteTelefone,
      prospecto_cidade: form.clienteCidade,
      produto_descricao: finalProdutoDescricao,
      produto_material: materialString,
      produto_medidas: medidasString,
      valor_sugerido: finalValue,
      validade_dias: Number(form.validadeDias),
      status: statusVal,
    })
    .eq("id", budgetId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }
} else {
  const { error } = await (supabase as any)
    .from("orcamentos_salvos")
    .insert({
      id: budgetId,
      cliente_nome: form.clienteNome,
      cliente_telefone: form.clienteTelefone,
      cliente_cidade: form.clienteCidade,
      prospecto_nome: form.clienteNome,
      prospecto_telefone: form.clienteTelefone,
      prospecto_cidade: form.clienteCidade,
      produto_descricao: finalProdutoDescricao,
      produto_material: materialString,
      produto_medidas: medidasString,
      valor_sugerido: finalValue,
      validade_dias: Number(form.validadeDias),
      status: "Pendente",
      user_id: user.id,
    });

  if (error) {
    throw error;
  }
}

      window.dispatchEvent(new Event("orcamentos_updated"));
      toast.success(
        isEdit
          ? "Orçamento atualizado com sucesso!"
          : "Orçamento gerado e salvo com sucesso!"
      );

      setSalvoComSucesso(true);
      setPrintData(novoOrcamento);
    } catch (err: any) {
      console.error("Erro ao salvar orçamento:", err);
      toast.error("Erro ao salvar orçamento", {
        description: err?.message || "Ocorreu um erro inesperado.",
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleWhatsApp = async () => {
    const isLoading = salvando;
    if (isLoading) return;
    const hasEmptyDesc = items.some((item) => !item.descricao?.trim());
    if (!form.clienteNome || hasEmptyDesc || form.valorSugerido <= 0) {
      toast.error("Preencha cliente, descrição de todos os itens e verifique os valores");
      return;
    }

    let cleanPhone = form.clienteTelefone.replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("Informe o telefone do cliente para enviar por WhatsApp");
      return;
    }

    if (!cleanPhone.startsWith("55")) {
      cleanPhone = "55" + cleanPhone;
    } else if (cleanPhone.length < 12) {
      cleanPhone = "55" + cleanPhone;
    }

    setSalvando(true);
    const isEdit = !!initialData;
    const budgetId = isEdit ? initialData.id : window.crypto.randomUUID();
    const createdDate = isEdit ? initialData.criadoEm : new Date().toISOString();
    const statusVal = isEdit ? (initialData.status || "Pendente") : "Pendente";

    const originalValue = Number(form.valorSugerido);
    const discountValue = Number(form.desconto || 0);
    const finalValue = Math.max(0, originalValue - discountValue);

    const sanitizedItems = items.map((item) => ({
      produto_id: item.produto_id || undefined,
      nome: item.nome || item.descricao?.trim() || "Item sem descrição",
      descricao: item.descricao?.trim() || item.nome || "Item sem descrição",
      preco_unitario: Number(item.preco_unitario ?? item.valor ?? 0),
      especificacoes_customizadas: item.especificacoes_customizadas || undefined,
      imagem_url: item.imagem_url || undefined,
      material: item.material?.trim() || "",
      medidas: item.medidas?.trim() || "",
      valor: Math.max(0, Number(item.valor || item.preco_unitario || 0)),
      quantidade: Math.max(1, Math.round(Number(item.quantidade)) || 1),
      searchQuery: item.searchQuery?.trim() || "",
    }));

    const produtoString = sanitizedItems.map((i) => i.descricao).filter(Boolean).join(", ");
    const materialString = sanitizedItems.map((i) => i.material).filter(Boolean).join(", ") || "";
    const medidasString = sanitizedItems.map((i) => i.medidas).filter(Boolean).join(", ") || "";

    const finalProdutoDescricao = `${produtoString} ===JSON_ITENS===\n${JSON.stringify(sanitizedItems)}\n===END_JSON_ITENS===\n===METADATA===\n${JSON.stringify({
      cliente_id: form.cliente_id || null,
      clienteCpfCnpj: form.clienteCpfCnpj,
      formaPagamento: form.formaPagamento,
      clienteEmail: form.clienteEmail,
      clienteEndereco: form.clienteEndereco,
      observacoes: form.observacoes,
    })}\n===END_METADATA===`;

    const novoOrcamento: Orcamento = {
      id: budgetId,
      criadoEm: createdDate,
      cliente_id: form.cliente_id || null,
      clienteNome: form.clienteNome,
      clienteTelefone: form.clienteTelefone,
      clienteCidade: form.clienteCidade,
      clienteCpfCnpj: form.clienteCpfCnpj,
      clienteEmail: form.clienteEmail,
      clienteEndereco: form.clienteEndereco,
      observacoes: form.observacoes,
      formaPagamento: form.formaPagamento,
      produtoDescricao: finalProdutoDescricao,
      produtoMaterial: materialString,
      produtoMedidas: medidasString,
      valorSugerido: originalValue,
      desconto: discountValue,
      validadeDias: Number(form.validadeDias),
      status: statusVal,
    };

    try {
      // 1. Salvar no localStorage
      const localList = JSON.parse(localStorage.getItem("orcamentos_salvos") || "[]");
      if (isEdit) {
        const index = localList.findIndex((o: any) => o.id === budgetId);
        if (index > -1) {
          localList[index] = novoOrcamento;
        } else {
          localList.unshift(novoOrcamento);
        }
      } else {
        localList.unshift(novoOrcamento);
      }
      localStorage.setItem("orcamentos_salvos", JSON.stringify(localList));

      if (!user) {
  toast.error(
    "Sua sessão ainda não foi carregada. Aguarde alguns segundos e tente novamente."
  );
  return;
}

      // 2. Tentar salvar no Supabase
      if (user) {
        if (isEdit) {
          const { error } = await (supabase as any).from("orcamentos_salvos").update({
            cliente_nome: form.clienteNome,
            cliente_telefone: form.clienteTelefone,
            cliente_cidade: form.clienteCidade,
            prospecto_nome: form.clienteNome,
            prospecto_telefone: form.clienteTelefone,
            prospecto_cidade: form.clienteCidade,
            produto_descricao: finalProdutoDescricao,
            produto_material: materialString,
            produto_medidas: medidasString,
            valor_sugerido: finalValue,
            validade_dias: Number(form.validadeDias),
            status: statusVal,
          }).eq("id", budgetId).eq("user_id", user.id);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any).from("orcamentos_salvos").insert({
            id: budgetId,
            cliente_nome: form.clienteNome,
            cliente_telefone: form.clienteTelefone,
            cliente_cidade: form.clienteCidade,
            prospecto_nome: form.clienteNome,
            prospecto_telefone: form.clienteTelefone,
            prospecto_cidade: form.clienteCidade,
            produto_descricao: finalProdutoDescricao,
            produto_material: materialString,
            produto_medidas: medidasString,
            valor_sugerido: finalValue,
            validade_dias: Number(form.validadeDias),
            status: "Pendente",
            user_id: user.id,
          });
          if (error) throw error;
        }
      }

      window.dispatchEvent(new Event("orcamentos_updated"));
      toast.success(isEdit ? "Orçamento atualizado com sucesso!" : "Orçamento gerado e salvo com sucesso!");

      const formattedOriginal = originalValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const formattedDesconto = discountValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const formattedFinal = finalValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const itemsListText = sanitizedItems
        .map((item, index) => {
          const matStr = item.material ? ` (${item.material})` : "";
          const medStr = item.medidas ? ` - Medidas: ${item.medidas}` : "";
          const qtdStr = item.quantidade > 1 ? ` (Qtd: ${item.quantidade})` : "";
          const valStr = item.valor > 0 ? ` - R$ ${item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "";
          return `${index + 1}. ${item.descricao}${qtdStr}${matStr}${medStr}${valStr}`;
        })
        .join("\n");

      const msg = `Olá *${form.clienteNome}*, tudo bem? Aqui é da marcenaria. Segue o resumo do seu orçamento:
*CPF/CNPJ:* ${form.clienteCpfCnpj || "Não informado"}

*Itens do Orçamento:*
${itemsListText}

*Condições Comerciais:*
*Valor Sugerido:* R$ ${formattedOriginal}
${discountValue > 0 ? `*Desconto Especial:* R$ ${formattedDesconto}\n` : ""}*Valor Final Com Desconto:* R$ ${formattedFinal}
*Forma de Pagamento:* ${form.formaPagamento || "Não informado"}

*Validade da proposta:* ${form.validadeDias} dias.
Qualquer dúvida, estou à disposição!`;

      const encodedMsg = encodeURIComponent(msg);
      const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
      window.open(url, "_blank");

      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao enviar orçamento por WhatsApp:", err);
      toast.error("Erro ao enviar orçamento por WhatsApp", {
        description: err?.message || "Ocorreu um erro inesperado.",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-full h-full md:h-auto max-h-[90vh] md:max-h-[85vh] md:max-w-2xl md:rounded-2xl bg-card border shadow-[var(--shadow-elevated)] p-0 gap-0 overflow-hidden flex flex-col"
        onInteractOutside={(e) => { e.preventDefault(); }}
        onPointerDownOutside={(e) => { e.preventDefault(); }}
        onEscapeKeyDown={(e) => {
  if (activeItemSuggestIndex !== null) {
    e.preventDefault();
    setActiveItemSuggestIndex(null);
    setProductSuggestCoords(null);
    return;
  }

  e.preventDefault();
  handleClose();
}}
      >
        <DialogHeader className="px-6 py-4 border-b">
  <DialogTitle className="text-lg font-semibold tracking-tight text-amber-600 dark:text-amber-400">
    Formulário de Orçamento Rápido
  </DialogTitle>

  <DialogDescription className="text-xs text-muted-foreground mt-1">
    Gere propostas comerciais sem impactar a Linha de Produção ou o Financeiro
  </DialogDescription>
</DialogHeader>

        <form onSubmit={onSubmit} className="px-5 py-3.5 space-y-3 flex-1 overflow-y-auto pr-2.5 md:max-h-[75vh]">
          {/* CLIENTE */}
          {/* DADOS DO CLIENTE */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1.5">Dados do Cliente</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="md:col-span-2">
                <ClienteAutocomplete
                  value={form.cliente_id || undefined}
                  onSelect={(cliente) => {
                    if (!cliente) return;

                    setForm((s) => ({
                      ...s,
                      cliente_id: cliente.id,
                      clienteNome: cliente.nome || "",
                      clienteTelefone: cliente.telefone || "",
                      clienteCidade: cliente.cidade || "",
                      clienteCpfCnpj: cliente.cpf || "",
                      clienteEmail: cliente.email || "",
                      clienteEndereco: cliente.endereco || "",
                    }));
                  }}
                  onCreateNew={(nome) => {
                    setForm((s) => ({
                      ...s,
                      cliente_id: "",
                      clienteNome: nome,
                    }));
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-medium">Telefone</label>
                <input
                  type="text"
                  value={form.clienteTelefone}
                  onChange={(e) => set("clienteTelefone", e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Email</label>
                <input
                  type="email"
                  value={form.clienteEmail}
                  onChange={(e) => set("clienteEmail", e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium">CPF / CNPJ</label>
                <input
                  type="text"
                  value={form.clienteCpfCnpj}
                  onChange={(e) => set("clienteCpfCnpj", e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="CPF ou CNPJ"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Cidade / Estado</label>
                <input
                  type="text"
                  value={form.clienteCidade}
                  onChange={(e) => set("clienteCidade", e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="Cidade, UF"
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium">Endereço Completo</label>
                <input
                  type="text"
                  value={form.clienteEndereco}
                  onChange={(e) => set("clienteEndereco", e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="Rua, Número, Bairro, CEP"
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium">Observações Gerais</label>
                <input
                  type="text"
                  value={form.observacoes}
                  onChange={(e) => set("observacoes", e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="Observações sobre o cliente ou detalhes do projeto"
                />
              </div>
            </div>
          </div>

          {/* PRODUTOS */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1.5">Dados dos Produtos / Móveis</p>
            <div className="col-span-1 md:col-span-2 space-y-2.5">
              {items.map((item, idx) => (
                <ProductCardItem
                  key={idx}
                  idx={idx}
                  item={item}
                  itemsCount={items.length}
                  updateItem={updateItem}
                  removeItem={removeItem}
                  setActiveItemSuggestIndex={setActiveItemSuggestIndex}
                  productInputRefs={productInputRefs}
                />
              ))}
              <button
                type="button"
                onClick={addItem}
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-600/30 bg-amber-600/5 text-amber-600 text-xs font-medium hover:bg-amber-600/10 transition-colors"
              >
                <Plus className="size-3.5" />
                Adicionar outro produto
              </button>
            </div>
          </div>

          {/* VALOR / VALIDADE */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1.5">Condições Comerciais</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div>
                <label className="text-xs font-medium">Valor Sugerido (R$) *</label>
                <input
                  type="number"
                  required
                  disabled
                  value={form.valorSugerido || ""}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Desconto (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.desconto || ""}
                  onChange={(e) => set("desconto", Number(e.target.value) || 0)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Validade do Orçamento (dias)</label>
                <select
                  value={form.validadeDias}
                  onChange={(e) => set("validadeDias", Number(e.target.value))}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value={7}>7 dias</option>
                  <option value={15}>15 dias (padrão)</option>
                  <option value={30}>30 dias</option>
                  <option value={60}>60 dias</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Forma de Pagamento</label>
                <select
                  value={form.formaPagamento}
                  onChange={(e) => set("formaPagamento", e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value="À vista (Pix / Dinheiro)">À vista (Pix / Dinheiro)</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="A Combinar / Entrada + Parcelas">A Combinar / Entrada + Parcelas</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t flex-wrap">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 px-4 rounded-lg border text-sm hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={salvando}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition-opacity"
            >
              {salvando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageCircle className="size-4" />
              )}
              {salvando ? "Salvando..." : "Enviar por WhatsApp"}
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="h-10 px-5 inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-opacity"
            >
              {salvando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Printer className="size-4" />
              )}
              {salvando ? "Salvando..." : "Concluir / Imprimir PDF"}
            </button>
          </div>
        </form>
      </DialogContent>

      <div className="hidden">
        <PrintableOrcamento ref={printRef} orcamento={printData} config={config} />
      </div>

      {activeItemSuggestIndex !== null &&
        productSuggestCoords &&
        createPortal(
          <div
  data-product-suggest-portal="true"
  onMouseDown={(e) => {
    e.stopPropagation();
  }}
  onPointerDown={(e) => {
    e.stopPropagation();
  }}
  style={{
    position: "fixed",
    top: `${productSuggestCoords.top}px`,
    left: `${productSuggestCoords.left}px`,
    width: `${productSuggestCoords.width}px`,
    zIndex: 999999,
    pointerEvents: "auto",
  }}
  className="rounded-lg border bg-popover shadow-[var(--shadow-elevated)] overflow-hidden"
>
  <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
    <span className="text-xs font-semibold">
      Catálogo de Produtos
    </span>

    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();

        setActiveItemSuggestIndex(null);
        setProductSuggestCoords(null);
      }}
      className="size-7 grid place-items-center rounded-md hover:bg-accent"
      aria-label="Fechar catálogo"
      title="Fechar catálogo"
    >
      <X className="size-4" />
    </button>
  </div>

  <div className="max-h-48 overflow-y-auto">
    {loadingSuggestions ? (
      <div className="px-3 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="size-3.5 animate-spin" />
        Carregando...
      </div>
    ) : productSuggestions.length === 0 ? (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        Nenhum produto no catálogo
      </div>
    ) : (
      <ul className="py-1">
        {productSuggestions.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              style={{
                pointerEvents: "auto",
                touchAction: "manipulation",
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (activeItemSuggestIndex !== null) {
                  handleSelectProduct(
                    activeItemSuggestIndex,
                    c
                  );
                }
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm flex items-center min-w-0 cursor-pointer"
            >
              {c.imagem_url ? (
                <img
                  src={c.imagem_url}
                  alt={c.nome}
                  className="w-8 h-8 rounded-md object-contain p-0.5 mr-2 bg-muted flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-md mr-2 bg-slate-100 flex-shrink-0 flex items-center justify-center text-muted-foreground">
                  <Sofa className="size-4" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {c.nome}
                  {c.preco != null && ` - ${moeda(c.preco)}`}
                </p>

                {c.material && (
                  <p className="text-xs text-muted-foreground truncate">
                    {c.material}
                  </p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
</div>,
          document.body
        )}
    </Dialog>
  );
}

export interface PrintableOrcamentoProps {
  orcamento: Orcamento | null;
  config: any;
}

export const PrintableOrcamento = forwardRef<
  HTMLDivElement,
  PrintableOrcamentoProps
>(({ orcamento, config }, ref) => {
  if (!orcamento) return null;

  const dataEmissao = new Date(orcamento.criadoEm).toLocaleDateString(
    "pt-BR"
  );

  const dataValidade = new Date(
    new Date(orcamento.criadoEm).getTime() +
      orcamento.validadeDias * 24 * 60 * 60 * 1000
  ).toLocaleDateString("pt-BR");

  const formatMoeda = (val: number) =>
    Number(val || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const cleanLatexMedidas = (medidas: string): string => {
    if (!medidas) return "";

    let clean = medidas.replace(/\$/g, "");
    clean = clean.replace(/\\times/gi, " x ");
    clean = clean.replace(/\s+/g, " ");
    clean = clean.replace(/\\/g, "");

    return clean.trim();
  };

  /* METADADOS */
  const meta = useMemo(() => {
    let clienteCpfCnpj = orcamento.clienteCpfCnpj || "";
    let formaPagamento =
      orcamento.formaPagamento || "À vista (Pix / Dinheiro)";

    const desc = orcamento.produtoDescricao || "";

    if (desc.includes("===METADATA===")) {
      try {
        const parts = desc.split("===METADATA===\n");

        if (parts.length > 1) {
          const jsonPart =
            parts[1].split("\n===END_METADATA===")[0];

          const parsed = JSON.parse(jsonPart);

          if (parsed.clienteCpfCnpj) {
            clienteCpfCnpj = parsed.clienteCpfCnpj;
          }

          if (parsed.formaPagamento) {
            formaPagamento = parsed.formaPagamento;
          }
        }
      } catch {
        // Mantém os valores originais caso o metadata não seja válido.
      }
    }

    return {
      clienteCpfCnpj,
      formaPagamento,
    };
  }, [orcamento]);

  /* ITENS */
  const parsedItems = useMemo<ItemRow[]>(() => {
    const desc = orcamento.produtoDescricao || "";

    let itemsList: ItemRow[] = [];

    if (desc.includes("===JSON_ITENS===")) {
      try {
        const parts = desc.split("===JSON_ITENS===\n");

        if (parts.length > 1) {
          const jsonPart =
            parts[1].split("\n===END_JSON_ITENS===")[0];

          itemsList = JSON.parse(jsonPart);
        }
      } catch {
        // Usa o item principal abaixo caso o JSON não seja válido.
      }
    }

    if (itemsList.length === 0) {
      itemsList = [
        {
          descricao: orcamento.produtoDescricao || "",
          material: orcamento.produtoMaterial || "",
          medidas: orcamento.produtoMedidas || "",
          valor: orcamento.valorSugerido || 0,
          quantidade: 1,
        },
      ];
    }

    return itemsList;
  }, [orcamento]);

  const valorOriginal = parsedItems.reduce((total, item) => {
    const quantidade = Number(item.quantidade || 1);
    const valor = Number(item.valor || 0);

    return total + quantidade * valor;
  }, 0);

  const desconto = Number(orcamento.desconto || 0);

  const valorFinal =
    desconto > 0
      ? Math.max(0, valorOriginal - desconto)
      : Number(
          orcamento.valorSugerido || valorOriginal || 0
        );

  const enderecoCliente =
    orcamento.clienteEndereco || "";

  const status = orcamento.status || "Pendente";

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        maxWidth: "760px",
        padding: "32px",
        backgroundColor: "#fff",
        color: "#334155",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: "11px",
        lineHeight: "1.4",
        boxSizing: "border-box",
      }}
    >
      {/* CABEÇALHO */}
      <div className="flex flex-row justify-between items-center gap-4 pb-6 border-b-2 border-slate-200">
        <div className="flex items-center gap-4">
          {config?.logo_url ? (
            <div className="h-16 w-16 rounded-xl border bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={config.logo_url}
                alt="Logo Marcenaria"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-xl bg-slate-900 text-white shrink-0 flex items-center justify-center font-bold text-xl">
              M
            </div>
          )}

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {config?.nome_marcenaria || "Sua bancada"}
            </h1>

            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
              Gestão de Marcenaria
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-slate-500 space-y-1">
          {config?.endereco && (
            <p className="max-w-[250px] leading-tight">
              {config.endereco}
            </p>
          )}

          {config?.telefone && (
            <p className="font-semibold text-slate-800">
              WhatsApp: {config.telefone}
            </p>
          )}
        </div>
      </div>

      {/* TÍTULO */}
      <div className="mt-8 flex justify-between items-end border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-semibold tracking-wider text-primary uppercase">
            Documento Comercial
          </span>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            PROPOSTA DE ORÇAMENTO
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Nº {orcamento.id}
          </p>
        </div>

        <div className="text-right text-xs text-slate-500 space-y-1">
          <p>
            Emissão:{" "}
            <span className="font-semibold text-slate-800">
              {dataEmissao}
            </span>
          </p>

          <p>
            Válido até:{" "}
            <span className="font-semibold text-slate-800">
              {dataValidade}
            </span>
          </p>
        </div>
      </div>

      {/* STATUS */}
      <div
        className="mt-6 grid grid-cols-2 gap-3 break-inside-avoid"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Status
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {status}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Validade
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {orcamento.validadeDias} dias
          </p>
        </div>
      </div>

      {/* DADOS DO CLIENTE */}
      <div
        className="mt-8 break-inside-avoid"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
          Dados do Cliente
        </h3>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-950 w-1/3">
                  Nome
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {orcamento.clienteNome || "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  CPF / CNPJ
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {meta.clienteCpfCnpj || "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Telefone / Celular
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {orcamento.clienteTelefone || "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  E-mail
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {orcamento.clienteEmail || "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Cidade / Localidade
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {orcamento.clienteCidade || "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Endereço
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {enderecoCliente || "Não informado"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* PROJETO / ITENS */}
<div
  className="mt-8 break-inside-avoid"
  style={{
    pageBreakInside: "avoid",
    breakInside: "avoid",
  }}
>
  <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
    Itens e Especificações
  </h3>

  <div className="border border-slate-200 rounded-xl overflow-hidden">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
          <th className="py-2.5 px-3 text-left w-8">
            #
          </th>

          <th className="py-2.5 px-3 text-left">
            Móvel / Projeto
          </th>

          <th className="py-2.5 px-3 text-left">
            Material
          </th>

          <th className="py-2.5 px-3 text-left">
            Medidas
          </th>

          <th className="py-2.5 px-3 text-center w-12">
            Qtd.
          </th>

          <th className="py-2.5 px-3 text-right">
            Valor Unit.
          </th>

          <th className="py-2.5 px-3 text-right">
            Subtotal
          </th>
        </tr>
      </thead>

      <tbody className="divide-y divide-slate-100">
        {parsedItems.map((item, index) => {
          const quantidade = Math.max(
            1,
            Number(item.quantidade || 1)
          );

          const valor = Number(
            item.valor ??
              item.preco_unitario ??
              0
          );

          const subtotal =
            quantidade * valor;

          const descricao =
            item.descricao ||
            item.nome ||
            "Não informado";

          const nomeCatalogo =
            item.nome &&
            item.nome !== item.descricao
              ? item.nome
              : "";

          const especificacoes =
            item.especificacoes_customizadas ||
            "";

          return (
            <tr
              key={index}
              className="break-inside-avoid align-top"
              style={{
                pageBreakInside: "avoid",
                breakInside: "avoid",
              }}
            >
              <td className="py-3 px-3 text-slate-400 font-medium">
                {index + 1}
              </td>

              <td className="py-3 px-3">
                <div className="flex items-start gap-3">
                  {item.imagem_url ? (
                    <div className="w-14 h-14 shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                      <img
                        src={item.imagem_url}
                        alt={descricao}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {descricao}
                    </p>

                    {nomeCatalogo && (
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Produto do catálogo: {nomeCatalogo}
                      </p>
                    )}

                    {item.produto_id && (
                      <p className="mt-0.5 text-[9px] text-slate-400">
                        Código: {item.produto_id}
                      </p>
                    )}

                    {especificacoes && (
                      <div className="mt-2 rounded-md bg-slate-50 border border-slate-100 px-2 py-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          Especificações
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {especificacoes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </td>

              <td className="py-3 px-3 text-slate-600">
                {item.material || "—"}
              </td>

              <td className="py-3 px-3 text-slate-600 font-mono text-xs">
                {cleanLatexMedidas(
                  item.medidas || ""
                ) || "—"}
              </td>

              <td className="py-3 px-3 text-center text-slate-800">
                {quantidade}
              </td>

              <td className="py-3 px-3 text-right text-slate-800 tabular-nums whitespace-nowrap">
                {formatMoeda(valor)}
              </td>

              <td className="py-3 px-3 text-right text-slate-900 font-semibold tabular-nums whitespace-nowrap">
                {formatMoeda(subtotal)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</div>

      {/* OBSERVAÇÕES */}
      {orcamento.observacoes && (
        <div
          className="mt-8 break-inside-avoid"
          style={{
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
            Observações
          </h3>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {orcamento.observacoes}
          </div>
        </div>
      )}

      {/* CONDIÇÕES COMERCIAIS */}
      <div
        className="mt-8 break-inside-avoid"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
          Condições Comerciais
        </h3>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-4 font-medium text-slate-500 w-1/3">
                  Data de Emissão
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {dataEmissao}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Validade
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {orcamento.validadeDias} dias — até{" "}
                  {dataValidade}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Forma de Pagamento
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {meta.formaPagamento ||
                    "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Valor Original
                </td>

                <td className="py-3 px-4 text-slate-800 font-semibold">
                  {formatMoeda(valorOriginal)}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Desconto
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {formatMoeda(desconto)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TOTAL */}
      <div
        className="mt-8 bg-slate-950 text-white rounded-2xl p-6 break-inside-avoid"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Valor Final do Orçamento
            </p>

            {desconto > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Desconto aplicado:{" "}
                {formatMoeda(desconto)}
              </p>
            )}
          </div>

          <p className="text-2xl font-bold text-white">
            {formatMoeda(valorFinal)}
          </p>
        </div>
      </div>

      {/* AVISOS */}
      <div
        className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed break-inside-avoid"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <p className="font-semibold text-slate-800 mb-1">
          Informações importantes
        </p>

        <p>
          Este documento é uma proposta de orçamento e
          serve como referência comercial para o projeto.
        </p>

        <p className="mt-1">
          O orçamento é válido por{" "}
          <strong>{orcamento.validadeDias} dias</strong>,
          contados a partir da data de emissão.
        </p>

        <p className="mt-1">
          Medidas, materiais, valores e demais
          especificações poderão ser ajustados mediante
          aprovação entre as partes.
        </p>
      </div>

      {/* LOCAL E DATA */}
      <div
        className="mt-12 text-sm font-medium text-slate-700 break-inside-avoid"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        Maceió - AL, _____ de __________________ de 20___
      </div>

      {/* ASSINATURAS */}
      <div
        className="mt-16 grid grid-cols-2 gap-12 break-inside-avoid pt-4"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <div className="flex flex-col items-center justify-end">
          <div className="w-full border-b border-slate-300 mb-2" />

          <span className="text-xs text-slate-800 uppercase font-bold tracking-wider text-center">
            {orcamento.clienteNome || "Cliente"}
          </span>

          <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
            Cliente
          </span>
        </div>

        <div className="flex flex-col items-center justify-end">
          <div className="w-full border-b border-slate-300 mb-2" />

          <span className="text-xs text-slate-800 uppercase font-bold tracking-wider text-center">
            {config?.nome_marcenaria || "Marcenaria"}
          </span>

          <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
            Responsável
          </span>
        </div>
      </div>
    </div>
  );
});

PrintableOrcamento.displayName = "PrintableOrcamento";

interface ProductCardItemProps {
  idx: number;
  item: ItemRow;
  itemsCount: number;
  updateItem: (idx: number, field: keyof ItemRow, value: any) => void;
  removeItem: (idx: number) => void;
  setActiveItemSuggestIndex: (idx: number | null) => void;
  productInputRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

const ProductCardItem = React.memo(({
  idx,
  item,
  itemsCount,
  updateItem,
  removeItem,
  setActiveItemSuggestIndex,
  productInputRefs
}: ProductCardItemProps) => {
  return (
    <div className="border border-slate-200 dark:border-border/40 bg-slate-50/50 dark:bg-muted/10 p-3 rounded-xl mb-3 relative">
      {itemsCount > 1 && (
        <button
          type="button"
          onClick={() => removeItem(idx)}
          className="absolute top-3 right-3 size-10 inline-flex items-center justify-center rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors z-10"
          title="Remover item"
        >
          <Trash2 className="size-5" />
        </button>
      )}

      {/* Product Autocomplete Search Bar */}
      <div className="mb-3 pr-9">
        <label className="text-xs font-medium text-muted-foreground">Buscar no Catálogo</label>
        <div
  ref={(el) => {
    productInputRefs.current[idx] = el;
  }}
  data-product-input="true"
  className="mt-1 relative flex items-center gap-2"
>
          {item.imagem_url && (
            <img
              src={item.imagem_url}
              alt={item.nome || item.descricao}
              className="size-10 rounded-lg object-contain bg-background border p-0.5 flex-shrink-0"
            />
          )}
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={item.searchQuery || ""}
              onChange={(e) => {
                const val = e.target.value;
                console.log("[ORÇAMENTO] digitando catálogo:", val, "item:", idx);
                updateItem(idx, "searchQuery", val);
                setActiveItemSuggestIndex(idx);
              }}
              onFocus={() => {
                console.log("[ORÇAMENTO] foco no catálogo", idx);
                setActiveItemSuggestIndex(idx);
              }}
              placeholder="Buscar por produto..."
              className="w-full h-10 pl-9 pr-8 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            {(item.searchQuery || item.descricao) && (
              <Check className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-success" />
            )}
          </div>
        </div>
        {item.especificacoes_customizadas && (
          <p className="text-[11px] text-muted-foreground/80 mt-1.5 truncate">
            <span className="font-medium text-foreground/80">Especificações:</span> {item.especificacoes_customizadas}
          </p>
        )}
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
            className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <div>
          <label className="text-xs font-medium">Material principal</label>
          <input
            type="text"
            value={item.material}
            onChange={(e) => updateItem(idx, "material", e.target.value)}
            placeholder="Ex: MDF Branco"
            className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <div>
          <label className="text-xs font-medium">Medidas (AxLxP)</label>
          <input
            type="text"
            value={item.medidas}
            onChange={(e) => updateItem(idx, "medidas", e.target.value)}
            placeholder="Ex: 80x120x60"
            className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <div>
          <label className="text-xs font-medium">Qtd</label>
          <input
            type="number"
            min="1"
            value={item.quantidade || 1}
            onChange={(e) => {
              const val = Math.max(1, parseInt(e.target.value, 10) || 1);
              updateItem(idx, "quantidade", val);
            }}
            className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-center"
          />
        </div>

        <div>
          <label className="text-xs font-medium">Valor do Item (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.valor || ""}
            onChange={(e) => {
              const val = Math.max(0, parseFloat(e.target.value) || 0);
              updateItem(idx, "valor", val);
            }}
            placeholder="0.00"
            className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </div>
    </div>
  );
});

ProductCardItem.displayName = "ProductCardItem";
