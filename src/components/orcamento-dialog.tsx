import { useEffect, useState, useRef, forwardRef, type FormEvent } from "react";
import { Loader2, Printer, MessageCircle } from "lucide-react";
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
}

interface OrcamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Orcamento | null;
}

export function OrcamentoDialog({ open, onOpenChange, initialData }: OrcamentoDialogProps) {
  const { user } = useAuth();
  
  const emptyForm = {
    clienteNome: "",
    clienteTelefone: "",
    clienteCidade: "",
    produtoDescricao: "",
    produtoMaterial: "",
    produtoMedidas: "",
    valorSugerido: 0,
    validadeDias: 15,
  };

  const [form, setForm] = useState(emptyForm);
  const [salvando, setSalvando] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [printData, setPrintData] = useState<Orcamento | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => {
      setPrintData(null);
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          clienteNome: initialData.clienteNome || "",
          clienteTelefone: initialData.clienteTelefone || "",
          clienteCidade: initialData.clienteCidade || "",
          produtoDescricao: initialData.produtoDescricao || "",
          produtoMaterial: initialData.produtoMaterial || "",
          produtoMedidas: initialData.produtoMedidas || "",
          valorSugerido: initialData.valorSugerido || 0,
          validadeDias: initialData.validadeDias || 15,
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, initialData]);

  // Carrega configurações da marcenaria para o cabeçalho do PDF
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
    if (printData) {
      handlePrint();
    }
  }, [printData]);

  const set = (k: string, v: any) => {
    setForm((s) => ({ ...s, [k]: v }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.clienteNome || !form.produtoDescricao || form.valorSugerido <= 0) {
      toast.error("Preencha cliente, descrição do produto e o valor sugerido");
      return;
    }

    setSalvando(true);
    const isEdit = !!initialData;
    const budgetId = isEdit ? initialData.id : window.crypto.randomUUID();
    const createdDate = isEdit ? initialData.criadoEm : new Date().toISOString();
    const statusVal = isEdit ? (initialData.status || "Pendente") : "Pendente";

    const novoOrcamento: Orcamento = {
      id: budgetId,
      criadoEm: createdDate,
      clienteNome: form.clienteNome,
      clienteTelefone: form.clienteTelefone,
      clienteCidade: form.clienteCidade,
      produtoDescricao: form.produtoDescricao,
      produtoMaterial: form.produtoMaterial,
      produtoMedidas: form.produtoMedidas,
      valorSugerido: Number(form.valorSugerido),
      validadeDias: Number(form.validadeDias),
      status: statusVal,
    };

    // 1. Salvar no localStorage
    try {
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
    } catch (err) {
      console.error("Erro ao salvar no localStorage:", err);
    }

    // 2. Tentar salvar no Supabase (silencioso caso falhe/tabela não exista)
    if (user) {
      try {
        if (isEdit) {
          await (supabase as any).from("orcamentos_salvos").update({
            cliente_nome: form.clienteNome,
            cliente_telefone: form.clienteTelefone,
            cliente_cidade: form.clienteCidade,
            prospecto_nome: form.clienteNome,
            prospecto_telefone: form.clienteTelefone,
            prospecto_cidade: form.clienteCidade,
            produto_descricao: form.produtoDescricao,
            produto_material: form.produtoMaterial,
            produto_medidas: form.produtoMedidas,
            valor_sugerido: Number(form.valorSugerido),
            validade_dias: Number(form.validadeDias),
            status: statusVal,
          }).eq("id", budgetId).eq("user_id", user.id);
        } else {
          await (supabase as any).from("orcamentos_salvos").insert({
            cliente_nome: form.clienteNome,
            cliente_telefone: form.clienteTelefone,
            cliente_cidade: form.clienteCidade,
            prospecto_nome: form.clienteNome,
            prospecto_telefone: form.clienteTelefone,
            prospecto_cidade: form.clienteCidade,
            produto_descricao: form.produtoDescricao,
            produto_material: form.produtoMaterial,
            produto_medidas: form.produtoMedidas,
            valor_sugerido: Number(form.valorSugerido),
            validade_dias: Number(form.validadeDias),
            status: "Pendente",
            user_id: user.id,
          });
        }
      } catch (dbErr) {
        console.warn("Supabase table operation skipped or failed. Fallback to localStorage active.", dbErr);
      }
    }

    // Disparar evento global para recarregar o histórico na listagem
    window.dispatchEvent(new Event("orcamentos_updated"));
    toast.success(isEdit ? "Orçamento atualizado com sucesso!" : "Orçamento gerado e salvo com sucesso!");
    setSalvando(false);
    
    // Inicia a impressão
    setPrintData(novoOrcamento);
  };

  const handleWhatsApp = async () => {
    if (!form.clienteNome || !form.produtoDescricao || form.valorSugerido <= 0) {
      toast.error("Preencha cliente, descrição do produto e o valor sugerido");
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

    const novoOrcamento: Orcamento = {
      id: budgetId,
      criadoEm: createdDate,
      clienteNome: form.clienteNome,
      clienteTelefone: form.clienteTelefone,
      clienteCidade: form.clienteCidade,
      produtoDescricao: form.produtoDescricao,
      produtoMaterial: form.produtoMaterial,
      produtoMedidas: form.produtoMedidas,
      valorSugerido: Number(form.valorSugerido),
      validadeDias: Number(form.validadeDias),
      status: statusVal,
    };

    // 1. Salvar no localStorage
    try {
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
    } catch (err) {
      console.error("Erro ao salvar no localStorage:", err);
    }

    // 2. Tentar salvar no Supabase (silencioso caso falhe/tabela não exista)
    if (user) {
      try {
        if (isEdit) {
          await (supabase as any).from("orcamentos_salvos").update({
            cliente_nome: form.clienteNome,
            cliente_telefone: form.clienteTelefone,
            cliente_cidade: form.clienteCidade,
            prospecto_nome: form.clienteNome,
            prospecto_telefone: form.clienteTelefone,
            prospecto_cidade: form.clienteCidade,
            produto_descricao: form.produtoDescricao,
            produto_material: form.produtoMaterial,
            produto_medidas: form.produtoMedidas,
            valor_sugerido: Number(form.valorSugerido),
            validade_dias: Number(form.validadeDias),
            status: statusVal,
          }).eq("id", budgetId).eq("user_id", user.id);
        } else {
          await (supabase as any).from("orcamentos_salvos").insert({
            cliente_nome: form.clienteNome,
            cliente_telefone: form.clienteTelefone,
            cliente_cidade: form.clienteCidade,
            prospecto_nome: form.clienteNome,
            prospecto_telefone: form.clienteTelefone,
            prospecto_cidade: form.clienteCidade,
            produto_descricao: form.produtoDescricao,
            produto_material: form.produtoMaterial,
            produto_medidas: form.produtoMedidas,
            valor_sugerido: Number(form.valorSugerido),
            validade_dias: Number(form.validadeDias),
            status: "Pendente",
            user_id: user.id,
          });
        }
      } catch (dbErr) {
        console.warn("Supabase table operation skipped or failed. Fallback to localStorage active.", dbErr);
      }
    }

    // Disparar evento global para recarregar o histórico na listagem
    window.dispatchEvent(new Event("orcamentos_updated"));
    toast.success(isEdit ? "Orçamento atualizado com sucesso!" : "Orçamento gerado e salvo com sucesso!");
    setSalvando(false);

    // Formatar valores para a mensagem
    const formattedValor = Number(form.valorSugerido).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const materialPart = form.produtoMaterial ? form.produtoMaterial : "Não informado";
    const medidasPart = form.produtoMedidas ? form.produtoMedidas : "Não informado";

    const msg = `Olá *${form.clienteNome}*, tudo bem? Aqui é da marcenaria. Segue o resumo do seu orçamento:
*Projeto:* ${form.produtoDescricao}
*Material:* ${materialPart} | *Medidas:* ${medidasPart}
*Valor Sugerido:* R$ ${formattedValor}
*Validade da proposta:* ${form.validadeDias} dias.
Qualquer dúvida, estou à disposição!`;

    const encodedMsg = encodeURIComponent(msg);
    const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    window.open(url, "_blank");

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl bg-card border shadow-[var(--shadow-elevated)] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold tracking-tight text-amber-600 dark:text-amber-400">
            Formulário de Orçamento Rápido
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Gere propostas comerciais sem impactar o Kanban ou o Financeiro
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* CLIENTE */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-2">Dados do Cliente</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              <div className="md:col-span-3">
                <label className="text-xs font-medium">Cidade / Estado</label>
                <input
                  type="text"
                  value={form.clienteCidade}
                  onChange={(e) => set("clienteCidade", e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="Cidade, UF"
                />
              </div>
            </div>
          </div>

          {/* PRODUTO */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-2">Dados do Produto / Móvel</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Descrição do Móvel / Projeto *</label>
                <input
                  type="text"
                  required
                  value={form.produtoDescricao}
                  onChange={(e) => set("produtoDescricao", e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="Ex: Guarda-Roupa Planejado de MDF"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Material principal</label>
                  <input
                    type="text"
                    value={form.produtoMaterial}
                    onChange={(e) => set("produtoMaterial", e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="Ex: MDF Carvalho e Off white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Medidas gerais (AxLxP)</label>
                  <input
                    type="text"
                    value={form.produtoMedidas}
                    onChange={(e) => set("produtoMedidas", e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="Ex: 2.40m x 3.00m x 0.60m"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* VALOR / VALIDADE */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-2">Condições Comerciais</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Valor Sugerido (R$) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={form.valorSugerido || ""}
                  onChange={(e) => set("valorSugerido", Number(e.target.value) || 0)}
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
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t flex-wrap">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
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
              <MessageCircle className="size-4" />
              Enviar por WhatsApp
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
              Concluir / Imprimir PDF
            </button>
          </div>
        </form>
      </DialogContent>

      <div className="hidden">
        <PrintableOrcamento ref={printRef} orcamento={printData} config={config} />
      </div>
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
              <p className="text-xs text-slate-400 font-medium">Telefone / Celular</p>
              <p className="font-medium text-slate-800 mt-0.5">{orcamento.clienteTelefone || "Não informado"}</p>
            </div>
            <div className="md:col-span-2">
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
                  <th className="py-2.5 px-4 text-left w-1/3">Item / Atributo</th>
                  <th className="py-2.5 px-4 text-left">Especificação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-950">Móvel / Descrição</td>
                  <td className="py-3 px-4 text-slate-800">{orcamento.produtoDescricao}</td>
                </tr>
                {orcamento.produtoMaterial && (
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-500">Material Planejado</td>
                    <td className="py-3 px-4 text-slate-800">{orcamento.produtoMaterial}</td>
                  </tr>
                )}
                {orcamento.produtoMedidas && (
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-500">Medidas Gerais</td>
                    <td className="py-3 px-4 text-slate-800">{orcamento.produtoMedidas}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CONDICIONAL FINANCEIRO */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="text-xs text-amber-800 uppercase font-semibold tracking-wider">
            Valor Sugerido para o Projeto
          </p>
          <p className="text-3xl font-extrabold mt-1.5 text-amber-950">{formatMoeda(orcamento.valorSugerido)}</p>
          <p className="text-xs text-slate-500 mt-2">
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
