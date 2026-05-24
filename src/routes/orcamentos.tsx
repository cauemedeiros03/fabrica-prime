import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useClientes } from "@/hooks/use-clientes";
import { useCreatePedido } from "@/hooks/use-pedidos";
import { moeda } from "@/lib/mock-data";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Loader2,
  FileText,
  LayoutGrid,
  List,
  Printer,
  Pencil,
  Trash2,
  CheckCircle,
  MessageCircle,
  Check,
  TrendingUp,
  MapPin,
  Phone,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { OrcamentoDialog, PrintableOrcamento, type Orcamento } from "@/components/orcamento-dialog";

export const Route = createFileRoute("/orcamentos")({
  component: OrcamentosPage,
  head: () => ({ meta: [{ title: "Orçamentos · Sua bancada" }] }),
});

const mapDbRowToOrcamento = (row: any): Orcamento => ({
  id: row.id,
  criadoEm: row.created_at || row.criadoEm,
  clienteNome: row.prospecto_nome || row.cliente_nome || row.clienteNome,
  clienteTelefone: row.prospecto_telefone || row.cliente_telefone || row.clienteTelefone || "",
  clienteCidade: row.prospecto_cidade || row.cliente_cidade || row.clienteCidade || "",
  produtoDescricao: row.produto_descricao || row.produtoDescricao,
  produtoMaterial: row.produto_material || row.produtoMaterial || "",
  produtoMedidas: row.produto_medidas || row.produtoMedidas || "",
  valorSugerido: Number(row.valor_sugerido || row.valorSugerido),
  validadeDias: Number(row.validade_dias || row.validadeDias || 15),
  status: row.status || "Pendente",
});

function OrcamentosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clientes = [] } = useClientes();
  const createPedido = useCreatePedido();
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [openNew, setOpenNew] = useState(false);
  const [edit, setEdit] = useState<Orcamento | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState<Orcamento | null>(null);
  const [confirmarConversao, setConfirmarConversao] = useState<Orcamento | null>(null);
  const [printData, setPrintData] = useState<Orcamento | null>(null);
  const [config, setConfig] = useState<any>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => setPrintData(null),
  });

  useEffect(() => {
    if (printData) {
      handlePrint();
    }
  }, [printData]);

  // Carrega configurações da marcenaria para impressão
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
    loadConfig();
  }, [user]);

  // Busca e mescla orçamentos
  const fetchOrcamentos = async () => {
    let list: Orcamento[] = [];

    // 1. LocalStorage
    try {
      const local = JSON.parse(localStorage.getItem("orcamentos_salvos") || "[]");
      list = local.map((row: any) => mapDbRowToOrcamento(row));
    } catch (e) {
      console.error("Erro ao ler localStorage:", e);
    }

    // 2. Supabase
    if (user) {
      try {
        const { data, error } = await (supabase as any)
          .from("orcamentos_salvos")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          const dbList = data.map((row: any) => mapDbRowToOrcamento(row));
          const dbIds = new Set(dbList.map((o: Orcamento) => o.id));
          const uniqueLocal = list.filter((o: Orcamento) => !dbIds.has(o.id));
          list = [...dbList, ...uniqueLocal];
        }
      } catch (dbErr) {
        console.warn("Falha ao buscar orçamentos no Supabase, usando localStorage", dbErr);
      }
    }

    list.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
    return list;
  };

  const { data: orcamentos = [], isLoading, refetch } = useQuery({
    queryKey: ["orcamentos"],
    queryFn: fetchOrcamentos,
  });

  // Atualiza listagem ao disparar evento global
  useEffect(() => {
    const handler = () => {
      refetch();
    };
    window.addEventListener("orcamentos_updated", handler);
    return () => window.removeEventListener("orcamentos_updated", handler);
  }, [refetch]);

  // Estatísticas calculadas sobre orçamentos PENDENTES
  const stats = useMemo(() => {
    const pendentes = orcamentos.filter((o) => (o.status || "Pendente") === "Pendente");
    const totalPendentesValor = pendentes.reduce((acc, o) => acc + o.valorSugerido, 0);
    const pendentesCount = pendentes.length;
    const ticketMedio = pendentesCount > 0 ? totalPendentesValor / pendentesCount : 0;

    return {
      total: totalPendentesValor,
      count: pendentesCount,
      pendentesCount,
      pendentesValor: totalPendentesValor,
      ticketMedio,
    };
  }, [orcamentos]);

  // Filtros aplicados na tela
  const filtrados = useMemo(() => {
    return orcamentos.filter((o) => {
      // Ocultar orçamentos aprovados completamente da renderização principal (Opção 2)
      if (o.status === "Aprovado") return false;

      // 1. Filtro de Busca (q)
      const qClean = q.toLowerCase();
      const matchQ =
        o.clienteNome.toLowerCase().includes(qClean) ||
        o.produtoDescricao.toLowerCase().includes(qClean) ||
        o.clienteCidade.toLowerCase().includes(qClean);

      return matchQ;
    });
  }, [orcamentos, q]);

  // Excluir orçamento
  const excluir = async () => {
    if (!confirmarExcluir) return;
    const id = confirmarExcluir.id;

    // 1. LocalStorage
    try {
      const local = JSON.parse(localStorage.getItem("orcamentos_salvos") || "[]");
      const updated = local.filter((o: any) => o.id !== id);
      localStorage.setItem("orcamentos_salvos", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    // 2. Supabase
    if (user) {
      try {
        await (supabase as any)
          .from("orcamentos_salvos")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
      } catch (e) {
        console.warn("Erro ao deletar no Supabase:", e);
      }
    }

    toast.success("Orçamento excluído com sucesso!");
    setConfirmarExcluir(null);
    refetch();
  };

  // Converter Orçamento em Pedido Oficial
  const converter = async () => {
    if (!confirmarConversao) return;
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }
    const orcamento = confirmarConversao;
    const id = orcamento.id;

    try {
      let clienteId = "";

      // 1. Buscar se existe cliente com mesmo nome
      const cleanName = orcamento.clienteNome.trim().toLowerCase();
      const existing = clientes.find((c) => c.nome.trim().toLowerCase() === cleanName);

      if (existing) {
        clienteId = existing.id;
      } else {
        // 2. Fazer o INSERT definitivo na tabela 'clientes' (gerando a ficha oficial)
        const { data: newClient, error: clientErr } = await supabase
          .from("clientes")
          .insert({
            nome: orcamento.clienteNome,
            telefone: orcamento.clienteTelefone || null,
            cidade: orcamento.clienteCidade || null,
            user_id: user.id,
          })
          .select("id")
          .single();

        if (clientErr) throw clientErr;
        if (!newClient) throw new Error("Falha ao criar ficha do cliente");
        clienteId = newClient.id;
      }

      const input: any = {
        cliente_id: clienteId,
        cliente_nome: orcamento.clienteNome,
        telefone: orcamento.clienteTelefone,
        cidade: orcamento.clienteCidade,
        produto: orcamento.produtoDescricao,
        material: orcamento.produtoMaterial,
        prioridade: "media",
        etapa: "pedido-recebido",
        valor_total: orcamento.valorSugerido,
        valor_pago: 0,
      };

      // 3. Criar pedido
      await createPedido.mutateAsync(input);

      // 4. Remover orçamento permanentemente (Hard Delete)
      // LocalStorage
      try {
        const local = JSON.parse(localStorage.getItem("orcamentos_salvos") || "[]");
        const updated = local.filter((o: any) => o.id !== id);
        localStorage.setItem("orcamentos_salvos", JSON.stringify(updated));
      } catch (e) {
        console.error("Erro ao deletar do localStorage:", e);
      }

      // Supabase
      if (user) {
        try {
          const { error: delErr } = await (supabase as any)
            .from("orcamentos_salvos")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);
          if (delErr) throw delErr;
        } catch (e) {
          console.warn("Erro ao deletar no Supabase:", e);
        }
      }

      // Atualizar cache local do TanStack Query imediatamente para garantir atualização em tempo real
      queryClient.setQueryData(["orcamentos"], (oldData: Orcamento[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((o) => o.id !== id);
      });

      toast.success("Orçamento convertido em Pedido com sucesso!", {
        action: {
          label: "Ver Pedidos",
          onClick: () => navigate({ to: "/pedidos" }),
        },
      });

      setConfirmarConversao(null);
      refetch();
    } catch (e) {
      toast.error("Erro ao converter orçamento", {
        description: e instanceof Error ? e.message : "",
      });
    }
  };

  const handleWhatsApp = (o: Orcamento) => {
    let cleanPhone = o.clienteTelefone.replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("Este cliente não possui telefone cadastrado");
      return;
    }

    if (!cleanPhone.startsWith("55")) {
      cleanPhone = "55" + cleanPhone;
    } else if (cleanPhone.length < 12) {
      cleanPhone = "55" + cleanPhone;
    }

    const formattedValor = Number(o.valorSugerido).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const materialPart = o.produtoMaterial ? o.produtoMaterial : "Não informado";
    const medidasPart = o.produtoMedidas ? o.produtoMedidas : "Não informado";

    const msg = `Olá *${o.clienteNome}*, tudo bem? Segue o resumo da proposta comercial que preparamos:
*Projeto:* ${o.produtoDescricao}
*Material:* ${materialPart} | *Medidas:* ${medidasPart}
*Valor:* R$ ${formattedValor}
*Validade:* ${o.validadeDias} dias.
Qualquer dúvida, estamos à disposição!`;

    const encodedMsg = encodeURIComponent(msg);
    const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    window.open(url, "_blank");
  };

  const renderCard = (o: Orcamento) => {
    const isAprovado = o.status === "Aprovado";
    const dataEmissao = new Date(o.criadoEm).toLocaleDateString("pt-BR");
    return (
      <div
        key={o.id}
        className="group rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] transition flex flex-col justify-between min-h-[220px]"
      >
        <div>
          <div className="flex justify-between items-start gap-2 mb-2">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Calendar className="size-3" /> {dataEmissao}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                isAprovado
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              {o.status || "Pendente"}
            </span>
          </div>

          <h4 className="font-semibold text-base text-foreground leading-snug group-hover:text-amber-600 transition">
            {o.clienteNome}
          </h4>

          {/* Detalhes do Produto */}
          <p className="text-sm font-medium text-muted-foreground mt-2 line-clamp-1">
            {o.produtoDescricao}
          </p>
          
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            {o.produtoMaterial && (
              <p>
                <span className="font-medium">Material:</span> {o.produtoMaterial}
              </p>
            )}
            {o.produtoMedidas && (
              <p>
                <span className="font-medium">Medidas:</span> {o.produtoMedidas}
              </p>
            )}
            {o.clienteCidade && (
              <p className="inline-flex items-center gap-1 mt-1 text-[11px]">
                <MapPin className="size-3 text-muted-foreground/60" /> {o.clienteCidade}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-muted/60 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] text-muted-foreground block uppercase font-medium">
                Valor Proposto
              </span>
              <span className="text-base font-bold tabular-nums text-foreground">
                {moeda(o.valorSugerido)}
              </span>
            </div>

            {/* Menu de Ações - Desktop */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setPrintData(o)}
                className="size-8 grid place-items-center rounded-lg border hover:bg-accent text-muted-foreground hover:text-foreground transition"
                title="Imprimir PDF"
              >
                <Printer className="size-3.5" />
              </button>
              {o.clienteTelefone && (
                <button
                  onClick={() => handleWhatsApp(o)}
                  className="size-8 grid place-items-center rounded-lg border hover:bg-green-600/10 hover:text-green-600 text-muted-foreground transition"
                  title="Enviar WhatsApp"
                >
                  <MessageCircle className="size-3.5" />
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-8 px-2 rounded-lg border text-xs font-medium hover:bg-accent transition">
                    Mais
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-card border">
                  <DropdownMenuItem onClick={() => setEdit(o)} className="cursor-pointer">
                    <Pencil className="size-3.5 mr-2" /> Editar
                  </DropdownMenuItem>
                  {!isAprovado && (
                    <DropdownMenuItem
                      onClick={() => setConfirmarConversao(o)}
                      className="cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium"
                    >
                      <Check className="size-3.5 mr-2" /> Aprovar / Pedido
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setConfirmarExcluir(o)}
                    className="cursor-pointer text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Barra de Ações Direta - Celular (sempre visível no mobile, botões de 40x40px) */}
          <div className="flex md:hidden items-center justify-between gap-2 w-full mt-2 pt-2 border-t border-dashed">
            {o.clienteTelefone ? (
              <button
                onClick={() => handleWhatsApp(o)}
                className="w-10 h-10 grid place-items-center rounded-lg border border-green-600/30 bg-card text-success hover:bg-green-600/10 transition-colors"
                title="Enviar WhatsApp"
              >
                <MessageCircle className="size-4" />
              </button>
            ) : (
              <div className="w-10 h-10" />
            )}
            <button
              onClick={() => setPrintData(o)}
              className="w-10 h-10 grid place-items-center rounded-lg border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Imprimir PDF"
            >
              <Printer className="size-4" />
            </button>
            <button
              onClick={() => setEdit(o)}
              className="w-10 h-10 grid place-items-center rounded-lg border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Editar"
            >
              <Pencil className="size-4" />
            </button>
            {!isAprovado && (
              <button
                onClick={() => setConfirmarConversao(o)}
                className="w-10 h-10 grid place-items-center rounded-lg border border-emerald-600/30 bg-card text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="Aprovar e Criar Pedido"
              >
                <CheckCircle className="size-4" />
              </button>
            )}
            <button
              onClick={() => setConfirmarExcluir(o)}
              className="w-10 h-10 grid place-items-center rounded-lg border border-destructive/30 bg-card text-destructive hover:bg-destructive/10 transition-colors"
              title="Excluir"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppShell
      title="Orçamentos"
      subtitle={
        isLoading
          ? "Carregando orçamentos..."
          : `${stats.count} orçamento(s) cadastrado(s) · ${stats.pendentesCount} pendente(s)`
      }
    >
      {/* 1. SEÇÃO DE ESTATÍSTICAS DO TOPO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* CARD TOTAL PROPOSTAS */}
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] relative overflow-hidden flex flex-col justify-between group hover:border-amber-500/30 transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Total de Orçamentos
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
                {moeda(stats.total)}
              </h3>
            </div>
            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
              <FileText className="size-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Soma de <span className="font-semibold text-foreground">{stats.count}</span> propostas ativas
          </p>
        </div>

        {/* CARD PROPOSTAS PENDENTES */}
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] relative overflow-hidden flex flex-col justify-between group hover:border-amber-500/30 transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Propostas Pendentes
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
                {moeda(stats.pendentesValor)}
              </h3>
            </div>
            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
              <Clock className="size-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {stats.pendentesCount}
            </span>{" "}
            orçamento(s) aguardando aprovação
          </p>
        </div>

        {/* CARD TICKET MÉDIO (PENDENTES) */}
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] relative overflow-hidden flex flex-col justify-between group hover:border-emerald-500/30 transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Ticket Médio (Pendentes)
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
                {moeda(stats.ticketMedio)}
              </h3>
            </div>
            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
              <TrendingUp className="size-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Média de valor das propostas em negociação
          </p>
        </div>
      </div>

      {/* 2. FILTROS E CRIAÇÃO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative max-w-md flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por cliente, projeto, cidade..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador de Layout */}
          <div className="h-10 p-1 bg-muted rounded-lg flex items-center shrink-0">
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 rounded-md transition ${
                view === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-1.5 rounded-md transition ${
                view === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="size-4" />
            </button>
          </div>

          <button
            onClick={() => setOpenNew(true)}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition"
          >
            <Plus className="size-4" /> Novo Orçamento
          </button>
        </div>
      </div>

      {/* 3. VISUALIZAÇÕES */}
      {isLoading ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-[var(--shadow-soft)]">
          <FileText className="size-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-lg">Nenhum orçamento encontrado</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {q
              ? "Tente refinar sua busca utilizando o nome de outro cliente ou projeto."
              : "Crie orçamentos rápidos para seus clientes sem impactar as métricas do Kanban principal."}
          </p>
          {!q && (
            <button
              onClick={() => setOpenNew(true)}
              className="mt-5 h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition"
            >
              <Plus className="size-4" /> Criar Orçamento
            </button>
          )}
        </div>
      ) : view === "grid" ? (
        /* GRID LAYOUT */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((o) => renderCard(o))}
        </div>
      ) : (
        /* TABLE LAYOUT */
        <>
          {/* Mobile view for Table selection (fallback to cards) */}
          <div className="block md:hidden grid grid-cols-1 gap-4">
            {filtrados.map((o) => renderCard(o))}
          </div>

          {/* Desktop view for Table selection */}
          <div className="hidden md:block rounded-2xl border bg-card overflow-hidden shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider border-b">
                  <tr>
                    <th className="text-left font-medium pl-5 pr-4 py-3">Cliente</th>
                    <th className="text-left font-medium px-4 py-3">Projeto / Móvel</th>
                    <th className="text-left font-medium px-4 py-3">Data</th>
                    <th className="text-right font-medium px-4 py-3">Valor Sugerido</th>
                    <th className="text-center font-medium px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtrados.map((o) => {
                    const isAprovado = o.status === "Aprovado";
                    const dataEmissao = new Date(o.criadoEm).toLocaleDateString("pt-BR");
                    return (
                      <tr key={o.id} className="hover:bg-accent/40 transition">
                        <td className="pl-5 pr-4 py-3.5 font-semibold text-foreground">
                          {o.clienteNome}
                          {o.clienteCidade && (
                            <span className="text-xs text-muted-foreground block font-normal">
                              {o.clienteCidade}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-foreground block">{o.produtoDescricao}</span>
                          {o.produtoMaterial && (
                            <span className="text-xs text-muted-foreground">{o.produtoMaterial}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground tabular-nums">
                          {dataEmissao}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-foreground tabular-nums">
                          {moeda(o.valorSugerido)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full inline-block ${
                              isAprovado
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {o.status || "Pendente"}
                          </span>
                        </td>
                        <td className="pl-4 pr-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setPrintData(o)}
                              className="size-8 grid place-items-center rounded-lg border hover:bg-accent text-muted-foreground hover:text-foreground transition"
                              title="Imprimir PDF"
                            >
                              <Printer className="size-3.5" />
                            </button>
                            {o.clienteTelefone && (
                              <button
                                onClick={() => handleWhatsApp(o)}
                                className="size-8 grid place-items-center rounded-lg border hover:bg-green-600/10 hover:text-green-600 text-muted-foreground transition"
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle className="size-3.5" />
                              </button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-8 px-2.5 rounded-lg border text-xs font-medium hover:bg-accent transition">
                                  Ações
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 bg-card border">
                                <DropdownMenuItem onClick={() => setEdit(o)} className="cursor-pointer">
                                  <Pencil className="size-3.5 mr-2" /> Editar
                                </DropdownMenuItem>
                                {!isAprovado && (
                                  <DropdownMenuItem
                                    onClick={() => setConfirmarConversao(o)}
                                    className="cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium"
                                  >
                                    <Check className="size-3.5 mr-2" /> Aprovar / Pedido
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => setConfirmarExcluir(o)}
                                  className="cursor-pointer text-destructive focus:bg-destructive/10"
                                >
                                  <Trash2 className="size-3.5 mr-2" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 4. MODAIS E DIÁLOGOS */}
      <OrcamentoDialog open={openNew} onOpenChange={setOpenNew} />
      
      <OrcamentoDialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        initialData={edit}
      />

      {/* Modal Confirmação de Exclusão */}
      {confirmarExcluir && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmarExcluir(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-[var(--shadow-elevated)]"
          >
            <h3 className="font-semibold tracking-tight text-lg">Remover orçamento?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Deseja realmente remover permanentemente o orçamento de{" "}
              <strong>{confirmarExcluir.clienteNome}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setConfirmarExcluir(null)}
                className="h-9 px-4 rounded-lg border text-sm hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={excluir}
                className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Conversão */}
      {confirmarConversao && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmarConversao(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-[var(--shadow-elevated)]"
          >
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 mb-3">
              <Sparkles className="size-5" />
              <h3 className="font-bold tracking-tight text-lg">Converter em Pedido Oficial?</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O orçamento de <strong>{confirmarConversao.clienteNome}</strong> no valor de{" "}
              <strong>{moeda(confirmarConversao.valorSugerido)}</strong> será convertido em um pedido ativo.
            </p>
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg border mt-3 space-y-1">
              <span>• Status do orçamento será marcado como <strong>Aprovado</strong>.</span>
              <br />
              <span>• O pedido será criado na primeira etapa (<strong>Pedido Recebido</strong>).</span>
              <br />
              <span>• O cliente será criado ou vinculado automaticamente no banco de dados.</span>
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setConfirmarConversao(null)}
                className="h-9 px-4 rounded-lg border text-sm hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={converter}
                disabled={createPedido.isPending}
                className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-60 transition"
              >
                {createPedido.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                Aprovar e Criar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impressora Oculta */}
      <div className="hidden">
        <PrintableOrcamento ref={printRef} orcamento={printData} config={config} />
      </div>
    </AppShell>
  );
}
