import React, { useCallback, useEffect, useMemo, useState, useRef, forwardRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Loader2, Printer, MessageCircle, X, Search, Check, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useReactToPrint } from "react-to-print";
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
}

interface ItemRow {
  descricao: string;
  material: string;
  medidas: string;
  valor: number;
  quantidade: number;
  searchQuery?: string;
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
    clienteNome: "",
    clienteTelefone: "",
    clienteCidade: "",
    clienteCpfCnpj: "",
    produtoDescricao: "",
    produtoMaterial: "",
    produtoMedidas: "",
    valorSugerido: 0,
    validadeDias: 15,
    desconto: 0,
    formaPagamento: "À vista (Pix / Dinheiro)",
  }), []);

  const baseForm = useMemo(() => {
    let metaCpfCnpj = "";
    let metaFormaPagamento = "À vista (Pix / Dinheiro)";
    const desc = initialData?.produtoDescricao || "";
    if (desc.includes("===METADATA===")) {
      try {
        const parts = desc.split("===METADATA===\n");
        if (parts.length > 1) {
          const jsonPart = parts[1].split("\n===END_METADATA===")[0];
          const meta = JSON.parse(jsonPart);
          if (meta.clienteCpfCnpj) metaCpfCnpj = meta.clienteCpfCnpj;
          if (meta.formaPagamento) metaFormaPagamento = meta.formaPagamento;
        }
      } catch {}
    }

    return initialData ? ({
      clienteNome: initialData.clienteNome || "",
      clienteTelefone: initialData.clienteTelefone || "",
      clienteCidade: initialData.clienteCidade || "",
      clienteCpfCnpj: initialData.clienteCpfCnpj || metaCpfCnpj || "",
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

  const printRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);

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
      } catch {}
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
    form.formaPagamento !== baseForm.formaPagamento ||
    Number(form.validadeDias) !== Number(baseForm.validadeDias) ||
    Number(form.desconto) !== Number(baseForm.desconto) ||
    JSON.stringify(items) !== JSON.stringify(initialItems),
    [form, baseForm, items, initialItems]
  );

  const handleClose = useCallback(() => {
    if (isDirty && !window.confirm("Você tem dados não salvos. Deseja fechar mesmo assim?")) return;
    onOpenChange(false);
  }, [isDirty, onOpenChange]);

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
        } catch {}
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

  useEffect(() => {
    async function fetchCatalogo() {
      try {
        const { data, error } = await supabase
          .from("catalogo_produtos")
          .select("*")
          .order("nome");
        if (error) throw error;
        setCatalogo(data || []);
      } catch (err) {
        console.error("Erro ao buscar catálogo:", err);
      }
    }
    if (open) fetchCatalogo();
  }, [open]);

  useEffect(() => {
    if (printData) {
      handlePrint();
    }
  }, [printData]);

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
        const dropdownHeight = 200;
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
    } else if (activeItemSuggestIndex !== null && activeItemSuggestIndex > idx) {
      setActiveItemSuggestIndex(activeItemSuggestIndex - 1);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const hasEmptyDesc = items.some((item) => !item.descricao?.trim());
    if (!form.clienteNome || hasEmptyDesc || form.valorSugerido <= 0) {
      toast.error("Preencha cliente, descrição de todos os itens e verifique os valores");
      return;
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
      descricao: item.descricao?.trim() || "Item sem descrição",
      material: item.material?.trim() || "",
      medidas: item.medidas?.trim() || "",
      valor: Math.max(0, Number(item.valor) || 0),
      quantidade: Math.max(1, Math.round(Number(item.quantidade)) || 1),
      searchQuery: item.searchQuery?.trim() || "",
    }));

    const produtoString = sanitizedItems.map((i) => i.descricao).filter(Boolean).join(", ");
    const materialString = sanitizedItems.map((i) => i.material).filter(Boolean).join(", ") || "";
    const medidasString = sanitizedItems.map((i) => i.medidas).filter(Boolean).join(", ") || "";

    const finalProdutoDescricao = `${produtoString} ===JSON_ITENS===\n${JSON.stringify(sanitizedItems)}\n===END_JSON_ITENS===\n===METADATA===\n${JSON.stringify({ clienteCpfCnpj: form.clienteCpfCnpj, formaPagamento: form.formaPagamento })}\n===END_METADATA===`;

    const novoOrcamento: Orcamento = {
      id: budgetId,
      criadoEm: createdDate,
      clienteNome: form.clienteNome,
      clienteTelefone: form.clienteTelefone,
      clienteCidade: form.clienteCidade,
      clienteCpfCnpj: form.clienteCpfCnpj,
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
      descricao: item.descricao?.trim() || "Item sem descrição",
      material: item.material?.trim() || "",
      medidas: item.medidas?.trim() || "",
      valor: Math.max(0, Number(item.valor) || 0),
      quantidade: Math.max(1, Math.round(Number(item.quantidade)) || 1),
      searchQuery: item.searchQuery?.trim() || "",
    }));

    const produtoString = sanitizedItems.map((i) => i.descricao).filter(Boolean).join(", ");
    const materialString = sanitizedItems.map((i) => i.material).filter(Boolean).join(", ") || "";
    const medidasString = sanitizedItems.map((i) => i.medidas).filter(Boolean).join(", ") || "";

    const finalProdutoDescricao = `${produtoString} ===JSON_ITENS===\n${JSON.stringify(sanitizedItems)}\n===END_JSON_ITENS===\n===METADATA===\n${JSON.stringify({ clienteCpfCnpj: form.clienteCpfCnpj, formaPagamento: form.formaPagamento })}\n===END_METADATA===`;

    const novoOrcamento: Orcamento = {
      id: budgetId,
      criadoEm: createdDate,
      clienteNome: form.clienteNome,
      clienteTelefone: form.clienteTelefone,
      clienteCidade: form.clienteCidade,
      clienteCpfCnpj: form.clienteCpfCnpj,
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
          e.preventDefault();
          handleClose();
        }}
      >
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-start justify-between">
          <div>
            <DialogTitle className="text-lg font-semibold tracking-tight text-amber-600 dark:text-amber-400">
              Formulário de Orçamento Rápido
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Gere propostas comerciais sem impactar a Linha de Produção ou o Financeiro
            </DialogDescription>
          </div>
          <button type="button" onClick={handleClose} className="size-10 grid place-items-center rounded-lg hover:bg-accent" aria-label="Fechar modal">
            <X className="size-5" />
          </button>
        </DialogHeader>

        <form onSubmit={onSubmit} className="px-5 py-3.5 space-y-3 flex-1 overflow-y-auto pr-2.5 md:max-h-[75vh]">
          {/* CLIENTE */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1.5">Dados do Cliente</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="md:col-span-2">
                <label className="text-xs font-medium">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={form.clienteNome}
                  onChange={(e) => set("clienteNome", e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="Nome completo"
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
              <div className="md:col-span-2">
                <label className="text-xs font-medium">Cidade / Estado</label>
                <input
                  type="text"
                  value={form.clienteCidade}
                  onChange={(e) => set("clienteCidade", e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="Cidade, UF"
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
              className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-60 transition"
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
              className="h-10 px-5 inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60 transition"
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
    </Dialog>
  );
}

export interface PrintableOrcamentoProps {
  orcamento: Orcamento | null;
  config: any;
}

export const PrintableOrcamento = forwardRef<HTMLDivElement, PrintableOrcamentoProps>(
  ({ orcamento, config }, ref) => {
    if (!orcamento) return null;

    const dataEmissao = new Date(orcamento.criadoEm).toLocaleDateString("pt-BR");
    const dataValidade = new Date(
      new Date(orcamento.criadoEm).getTime() + orcamento.validadeDias * 24 * 60 * 60 * 1000
    ).toLocaleDateString("pt-BR");

    const formatMoeda = (val: number) =>
      val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const meta = useMemo(() => {
      let clienteCpfCnpj = orcamento.clienteCpfCnpj || "";
      let formaPagamento = orcamento.formaPagamento || "À vista (Pix / Dinheiro)";
      const desc = orcamento.produtoDescricao || "";
      if (desc.includes("===METADATA===")) {
        try {
          const parts = desc.split("===METADATA===\n");
          if (parts.length > 1) {
            const jsonPart = parts[1].split("\n===END_METADATA===")[0];
            const parsed = JSON.parse(jsonPart);
            if (parsed.clienteCpfCnpj) clienteCpfCnpj = parsed.clienteCpfCnpj;
            if (parsed.formaPagamento) formaPagamento = parsed.formaPagamento;
          }
        } catch {}
      }
      return { clienteCpfCnpj, formaPagamento };
    }, [orcamento]);

    const parsedItems = useMemo<ItemRow[]>(() => {
      const desc = orcamento.produtoDescricao || "";
      let itemsList: ItemRow[] = [];
      if (desc.includes("===JSON_ITENS===")) {
        try {
          const parts = desc.split("===JSON_ITENS===\n");
          if (parts.length > 1) {
            const jsonPart = parts[1].split("\n===END_JSON_ITENS===")[0];
            itemsList = JSON.parse(jsonPart);
          }
        } catch {}
      }
      if (itemsList.length === 0) {
        itemsList = [{
          descricao: orcamento.produtoDescricao || "",
          material: orcamento.produtoMaterial || "",
          medidas: orcamento.produtoMedidas || "",
          valor: orcamento.valorSugerido || 0,
          quantidade: 1,
        }];
      }
      return itemsList;
    }, [orcamento]);

    return (
      <div
        ref={ref}
        className="w-full max-w-[800px] p-10 bg-white text-slate-800 font-sans shadow-none"
        style={{ contentVisibility: "auto" }}
      >
        {/* CABEÇALHO */}
        <div className="flex flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-200">
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
              <div className="h-16 w-16 rounded-xl bg-amber-600 text-white shrink-0 flex items-center justify-center font-bold text-xl uppercase">
                {(config?.nome_marcenaria || "M").slice(0, 1)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {config?.nome_marcenaria || "Sua bancada"}
              </h1>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
                Proposta Comercial de Marcenaria
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-0.5">
            {config?.endereco && <p className="max-w-[250px] leading-tight">{config.endereco}</p>}
            {config?.telefone && <p className="font-medium text-slate-800">WhatsApp: {config.telefone}</p>}
          </div>
        </div>

        {/* TÍTULO DO DOCUMENTO */}
        <div className="mt-8 flex justify-between items-end border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-amber-600 uppercase">
              Orçamento Informativo
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              PROPOSTA DE ORÇAMENTO
            </h2>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>
              Data de Emissão: <span className="font-semibold text-slate-800">{dataEmissao}</span>
            </p>
            <p className="mt-0.5 text-amber-700 font-medium">
              Válido até: <span>{dataValidade}</span>
            </p>
          </div>
        </div>

        {/* DADOS DO CLIENTE */}
        <div className="mt-8">
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
            Dados do Cliente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium">Nome</p>
              <p className="font-semibold text-slate-900 mt-0.5">{orcamento.clienteNome}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">CPF / CNPJ</p>
              <p className="font-semibold text-slate-900 mt-0.5">{meta.clienteCpfCnpj || "Não informado"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Telefone / Celular</p>
              <p className="font-medium text-slate-800 mt-0.5">{orcamento.clienteTelefone || "Não informado"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Cidade / Localidade</p>
              <p className="text-slate-700 mt-0.5">{orcamento.clienteCidade || "Não informado"}</p>
            </div>
          </div>
        </div>

        {/* DETALHES DO PRODUTO */}
        <div className="mt-8">
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
            Especificações do Projeto
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                  <th className="py-2.5 px-4 text-left w-8">#</th>
                  <th className="py-2.5 px-4 text-left">Móvel / Descrição</th>
                  <th className="py-2.5 px-4 text-left">Material</th>
                  <th className="py-2.5 px-4 text-left">Medidas</th>
                  <th className="py-2.5 px-4 text-center w-12">Qtd</th>
                  <th className="py-2.5 px-4 text-right w-24">Valor Unit.</th>
                  <th className="py-2.5 px-4 text-right w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedItems.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3 px-4 text-slate-400">{index + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.descricao}</td>
                    <td className="py-3 px-4 text-slate-600">{item.material || "—"}</td>
                    <td className="py-3 px-4 text-slate-600">{item.medidas || "—"}</td>
                    <td className="py-3 px-4 text-center text-slate-900">{item.quantidade || 1}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-800">{formatMoeda(item.valor || 0)}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium text-slate-900">
                      {formatMoeda((item.quantidade || 1) * (item.valor || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CONDICIONAL FINANCEIRO */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="max-w-md mx-auto space-y-2">
            <div className="flex justify-between items-center text-sm text-amber-800 font-medium">
              <span>Valor Original:</span>
              <span className="tabular-nums">{formatMoeda(orcamento.valorSugerido)}</span>
            </div>
            {Number(orcamento.desconto || 0) > 0 && (
              <div className="flex justify-between items-center text-sm text-emerald-700 font-semibold">
                <span>Desconto Especial:</span>
                <span className="tabular-nums">- {formatMoeda(Number(orcamento.desconto))}</span>
              </div>
            )}
            <div className="border-t border-amber-200 pt-2 flex justify-between items-center text-xl font-extrabold text-amber-950">
              <span>Valor Final Com Desconto:</span>
              <span className="tabular-nums">{formatMoeda(Math.max(0, orcamento.valorSugerido - Number(orcamento.desconto || 0)))}</span>
            </div>
            <div className="border-t border-dashed border-amber-200 pt-2 flex justify-between items-center text-sm text-amber-900 font-medium">
              <span>Forma de Pagamento:</span>
              <span className="font-semibold">{meta.formaPagamento}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-4 text-center">
            * Este orçamento é meramente informativo e está sujeito a alterações com base na medição final no local.
          </p>
        </div>

        {/* RODAPÉ */}
        <div className="mt-16 text-sm text-slate-500">
          <p className="text-xs">
            Esta proposta foi gerada no dia {dataEmissao} e é válida por {orcamento.validadeDias} dias corridos.
          </p>

          <div className="mt-16 grid grid-cols-2 gap-12">
            <div className="flex flex-col items-center">
              <div className="w-full border-b border-slate-300 mb-2"></div>
              <span className="text-xs text-slate-700 uppercase font-bold tracking-wider">
                {orcamento.clienteNome}
              </span>
              <span className="text-[10px] text-slate-400 uppercase">De acordo</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full border-b border-slate-300 mb-2"></div>
              <span className="text-xs text-slate-700 uppercase font-bold tracking-wider">
                {config?.nome_marcenaria || "Responsável"}
              </span>
              <span className="text-[10px] text-slate-400 uppercase">Marcenaria</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

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
            className="w-full h-10 pl-9 pr-8 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
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
