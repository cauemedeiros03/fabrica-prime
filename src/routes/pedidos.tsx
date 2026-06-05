import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ETAPAS, moeda, dataBR, PRIORIDADE_LABEL, PRIORIDADE_COR, type StatusEtapa, type Pedido } from "@/lib/mock-data";
import { usePedidos, useDeletePedido, useDuplicatePedido, useUpdatePedidoEtapa, useAddPagamento, getDataReferenciaArquivamento, type NovoPedidoInput } from "@/hooks/use-pedidos";
import { NovoPedidoDialog } from "@/components/novo-pedido-dialog";
import { PedidoViewerDialog } from "@/components/pedido-viewer-dialog";
import { Filter, Download, Search, Pencil, Trash2, Loader2, X, Copy, LayoutGrid, List, MessageCircle, ChevronLeft, ChevronRight, FileText, Printer, ClipboardList, Factory, TrendingUp, Plus } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { PedidoCard } from "@/components/pedido-card";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { useReactToPrint } from "react-to-print";
import { PrintableReceipt } from "@/components/printable-receipt";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";


type FiltroChave = "todos" | "atrasados" | "semana" | "pagamento" | "em-producao" | "entregues";

const FILTRO_LABEL: Record<FiltroChave, string> = {
  todos: "Todos",
  atrasados: "Atrasados",
  semana: "Esta semana",
  pagamento: "Pagamento pendente",
  "em-producao": "Em produção",
  entregues: "Entregues",
};

export const Route = createFileRoute("/pedidos")({
  component: PedidosPage,
  head: () => ({ meta: [{ title: "Pedidos · Sua bancada" }] }),
  validateSearch: (s: Record<string, unknown>): { filtro?: FiltroChave; etapa?: StatusEtapa; view?: 'kanban' | 'list' } => ({
    filtro: (s.filtro as FiltroChave) || undefined,
    etapa: (s.etapa as StatusEtapa) || undefined,
    view: (s.view as 'kanban' | 'list') || 'kanban',
  }),
});



type EditState = (Partial<NovoPedidoInput> & { id?: string }) | null;

function PedidosPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const filtro: FiltroChave = search.filtro ?? "todos";
  const etapaFiltro = search.etapa;
  const view = search.view ?? "kanban";
  const { data: pedidos = [], isLoading } = usePedidos();
  const [pagina, setPagina] = useState(1);
  const del = useDeletePedido();
  const dup = useDuplicatePedido();
  const updateEtapa = useUpdatePedidoEtapa();
  const addPagamento = useAddPagamento();
  const [edit, setEdit] = useState<EditState>(null);
  const [viewing, setViewing] = useState<(typeof pedidos)[number] | null>(null);
  const [confirmar, setConfirmar] = useState<{ id: string; numero: string } | null>(null);
  const [quitarSaldo, setQuitarSaldo] = useState<{ id: string; numero: string; saldo: number } | null>(null);

  const [config, setConfig] = useState<any>(null);
  const [printPedido, setPrintPedido] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => setPrintPedido(null),
  });

  const pedidosAtivos = useMemo(() => {
    return pedidos.filter((p) => {
      const etapaLower = String(p.etapa || "").toLowerCase();
      return !(
        etapaLower === "cancelado" ||
        etapaLower === "cancelada" ||
        etapaLower === "excluido" ||
        etapaLower === "excluído" ||
        p.excluido === true ||
        p.deleted === true ||
        p.ativo === false
      );
    });
  }, [pedidos]);

  const stats = useMemo(() => {
    const total = pedidosAtivos.length;
    const emProducao = pedidosAtivos.filter(p => 
      !["entregue", "pronto-entrega"].includes(String(p.etapa || "").toLowerCase())
    ).length;
    const valorTotal = pedidosAtivos.reduce((acc, p) => acc + (p.valorTotal || 0), 0);
    return { total, emProducao, valorTotal };
  }, [pedidosAtivos]);



  const exportarCSV = () => {
    if (filtrados.length === 0) {
      toast.error("Nenhum pedido para exportar");
      return;
    }

    const headers = [
      "Número",
      "Cliente",
      "Telefone",
      "Cidade",
      "Produto",
      "Tipo",
      "Material",
      "Cor",
      "Valor Total (R$)",
      "Valor Pago (R$)",
      "Saldo Devedor (R$)",
      "Entrega",
      "Criado Em",
      "Etapa",
      "Prioridade"
    ];

    const rows = filtrados.map(p => {
      const saldo = p.valorTotal - p.valorPago;
      const formataData = (isoStr: string) => {
        if (!isoStr) return "";
        const d = new Date(isoStr);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      };
      
      const etapaLabel = ETAPAS.find(e => e.id === p.etapa)?.label || p.etapa;
      const prioridadeLabel = PRIORIDADE_LABEL[p.prioridade] || p.prioridade;

      const escapeCsv = (val: string | number) => {
        const s = String(val);
        if (s.includes(";") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      return [
        escapeCsv(p.numero),
        escapeCsv(p.cliente),
        escapeCsv(p.telefone),
        escapeCsv(p.cidade),
        escapeCsv(p.produto),
        escapeCsv(p.tipo),
        escapeCsv(p.material),
        escapeCsv(p.cor),
        escapeCsv(p.valorTotal),
        escapeCsv(p.valorPago),
        escapeCsv(saldo),
        escapeCsv(formataData(p.entrega)),
        escapeCsv(formataData(p.criadoEm)),
        escapeCsv(etapaLabel),
        escapeCsv(prioridadeLabel)
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    const hojeStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `pedidos_${hojeStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Pedidos exportados com sucesso!");
  };

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
        console.error("Erro ao buscar configurações da marcenaria:", err);
      }
    }
    loadConfig();
  }, [user]);

  useEffect(() => {
    if (printPedido) {
      handlePrint();
    }
  }, [printPedido]);

  const setFiltro = (f: FiltroChave) =>
    navigate({ to: "/pedidos", search: { ...search, filtro: f === "todos" ? undefined : f, etapa: undefined } });
  const setView = (v: 'kanban' | 'list') => navigate({ to: "/pedidos", search: { ...search, view: v } });
  const limparFiltro = () => navigate({ to: "/pedidos", search: { view: search.view } });

  const filtrados = useMemo(() => {
    return pedidos.filter((p) => {
      // Cláusula defensiva estrita: ignorar pedidos cancelados, excluídos ou inativos
      const etapaLower = String(p.etapa || "").toLowerCase();
      if (
        etapaLower === "cancelado" ||
        etapaLower === "cancelada" ||
        etapaLower === "excluido" ||
        etapaLower === "excluído" ||
        p.excluido === true ||
        p.deleted === true ||
        p.ativo === false
      ) {
        return false;
      }

      const matchQ = [p.cliente, p.produto, p.numero, p.tipo, p.cidade]
        .join(" ").toLowerCase().includes(q.toLowerCase());
      if (!matchQ) return false;
      if (etapaFiltro) return etapaLower === String(etapaFiltro).toLowerCase();
      if (filtro === "atrasados") return new Date(p.entrega) < new Date() && etapaLower !== "entregue";
      if (filtro === "em-producao") return !["entregue", "pronto-entrega"].includes(etapaLower);
      if (filtro === "entregues") return etapaLower === "entregue";
      if (filtro === "semana") {
        const d = +new Date(p.entrega) - +new Date();
        return d > 0 && d < 1000 * 60 * 60 * 24 * 7;
      }
      if (filtro === "pagamento") return p.valorPago < p.valorTotal;
      return true;
    });
  }, [pedidos, q, filtro, etapaFiltro]);

  useEffect(() => {
    setPagina(1);
  }, [q, filtro, etapaFiltro]);

  const itensPorPagina = 15;
  const totalPaginas = Math.ceil(filtrados.length / itensPorPagina);
  const itensPaginados = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return filtrados.slice(inicio, inicio + itensPorPagina);
  }, [filtrados, pagina]);

  const filtroAtivoLabel = etapaFiltro
    ? ETAPAS.find((e) => e.id === etapaFiltro)?.label
    : filtro !== "todos"
      ? FILTRO_LABEL[filtro]
      : null;

  const editar = (p: (typeof pedidos)[number]) => {
    setEdit({
      id: p.id,
      cliente_id: p.clienteId,
      cliente_nome: p.cliente,
      telefone: p.telefone,
      cidade: p.cidade,
      email: p.email ?? "",
      produto: p.produto,
      tipo: p.tipo,
      material: p.material,
      cor: p.cor,
      observacoes: p.observacoes ?? "",
      entrega: p.entrega ? new Date(p.entrega).toISOString().slice(0, 10) : "",
      prioridade: p.prioridade,
      etapa: p.etapa,
      valor_total: p.valorTotal,
      valor_pago: p.valorPago,
      cpf: p.cpf ?? "",
      cep: p.cep ?? "",
      endereco: p.endereco ?? "",
      numero_endereco: p.numero_endereco ?? "",
      complemento: p.complemento ?? "",
      bairro: p.bairro ?? "",
      instagram: p.instagram ?? "",
      origem: p.origem ?? "",
    });
  };

  const apagar = async () => {
    if (!confirmar) return;
    try {
      await del.mutateAsync(confirmar.id);
      toast.success(`Pedido ${confirmar.numero} removido`);
    } catch (e: unknown) {
      toast.error("Erro ao remover", { description: e instanceof Error ? e.message : "" });
    }
    setConfirmar(null);
  };

  const handleUpdateEtapa = (id: string, novaEtapa: StatusEtapa) => {
    const p = pedidos.find(x => x.id === id);
    const etapaAnterior = (p?.etapa ?? null) as StatusEtapa | null;

    updateEtapa.mutate(
      { id, etapa: novaEtapa, etapaAnterior },
      {
        onSuccess: () => {
          const novaLabel = ETAPAS.find((x) => x.id === novaEtapa)?.label;
          const pedidoAtualizado = p ? { ...p, etapa: novaEtapa } : null;
          toast.success(`Status atualizado para ${novaLabel}`, {
            action: pedidoAtualizado
              ? { label: "Avisar Cliente", onClick: () => sendWhatsAppMessage(pedidoAtualizado) }
              : undefined,
          });
          if (p && novaEtapa === "entregue") {
            const saldo = p.valorTotal - p.valorPago;
            if (saldo > 0) setQuitarSaldo({ id: p.id, numero: p.numero, saldo });
          }
        },
        onError: () => toast.error("Erro ao mover pedido. Tente novamente."),
      }
    );
  };

  const handleQuitarSaldo = async () => {
    if (!quitarSaldo) return;
    try {
      await addPagamento.mutateAsync({
        pedido_id: quitarSaldo.id,
        valor: quitarSaldo.saldo,
        forma: "Quitação automática",
      });
      toast.success("Saldo quitado com sucesso!");
    } catch (e) {
      toast.error("Erro ao quitar saldo", { description: e instanceof Error ? e.message : "" });
    }
    setQuitarSaldo(null);
  };

  const subtitle = isLoading
    ? "Carregando…"
    : filtroAtivoLabel
      ? `${filtrados.length} pedido(s) · filtro: ${filtroAtivoLabel}`
      : `${filtrados.length} pedidos encontrados`;

  return (
    <AppShell title="Pedidos" subtitle={subtitle} breadcrumbs={[{ label: "Pedidos" }, ...(filtroAtivoLabel ? [{ label: filtroAtivoLabel }] : [])]}>
      {filtroAtivoLabel && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border bg-accent/30 px-3 py-2 text-sm">
          <Filter className="size-4 text-primary" />
          <span>Filtro ativo:</span>
          <span className="font-medium">{filtroAtivoLabel}</span>
          <button onClick={limparFiltro} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="size-3.5" /> Limpar filtro
          </button>
        </div>
      )}

      {/* 1. SEÇÃO DE ESTATÍSTICAS DO TOPO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* CARD TOTAL PEDIDOS */}
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] relative overflow-hidden flex flex-col justify-between group hover:border-primary/30 transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Total de Pedidos
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
                {stats.total}
              </h3>
            </div>
            <div className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <ClipboardList className="size-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Quantidade total de pedidos ativos
          </p>
        </div>

        {/* CARD EM PRODUÇÃO */}
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] relative overflow-hidden flex flex-col justify-between group hover:border-primary/30 transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Em Produção
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
                {stats.emProducao}
              </h3>
            </div>
            <div className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <Factory className="size-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Pedidos nas etapas de fabricação
          </p>
        </div>

        {/* CARD VALOR TOTAL EM CARTEIRA */}
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] relative overflow-hidden flex flex-col justify-between group hover:border-emerald-500/30 transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Valor em Carteira
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
                {moeda(stats.valorTotal)}
              </h3>
            </div>
            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
              <TrendingUp className="size-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Soma total de todos os pedidos ativos
          </p>
        </div>
      </div>

      {/* 2. FILTROS E CRIAÇÃO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
          <div className="relative max-w-md flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por cliente, produto, cidade…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          
          {/* Filtros rápidos */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted text-sm overflow-x-auto scrollbar-none shrink-0 max-w-full">
            {(["todos", "em-producao", "atrasados", "entregues", "semana", "pagamento"] as FiltroChave[]).map((k) => (
              <button
                key={k}
                onClick={() => setFiltro(k)}
                className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                  !etapaFiltro && filtro === k ? "bg-card shadow-[var(--shadow-soft)] font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {FILTRO_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-start">
          {/* Alternador de Layout */}
          <div className="h-10 p-1 bg-muted rounded-lg flex items-center shrink-0">
             <button onClick={() => setView('kanban')} className={`p-1.5 rounded-md transition ${view === 'kanban' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
               <LayoutGrid className="size-4" />
             </button>
             <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition ${view === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
               <List className="size-4" />
             </button>
          </div>

          <button
            onClick={exportarCSV}
            className="h-10 px-3 inline-flex items-center justify-center gap-2 rounded-lg border bg-card text-sm font-medium hover:bg-accent shrink-0"
          >
            <Download className="size-4" /> <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            onClick={() => setEdit({})}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-glow)] shrink-0"
          >
            <Plus className="size-4" /> Novo pedido
          </button>
        </div>
      </div>

      {isLoading ? (
         <div className="grid place-items-center py-20 text-muted-foreground">
           <Loader2 className="size-6 animate-spin" />
         </div>
      ) : view === 'kanban' ? (
        /* GRID RESPONSIVO DE PEDIDOS */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtrados.length === 0 ? (
            <div className="col-span-full text-center py-12 text-sm text-muted-foreground bg-card/30 rounded-2xl border border-dashed">
              Nenhum pedido encontrado.
            </div>
          ) : (
            filtrados.map((p) => (
              <PedidoCard
                key={p.id}
                p={p}
                onClick={() => setViewing(p)}
                onEdit={() => editar(p)}
                onDuplicate={async () => {
                  try {
                    const id = await dup.mutateAsync(p.id);
                    toast.success(`Pedido duplicado a partir de ${p.numero}`);
                    navigate({ to: "/pedidos/$pedidoId", params: { pedidoId: id } });
                  } catch (e) {
                    toast.error("Erro ao duplicar", { description: e instanceof Error ? e.message : "" });
                  }
                }}
                onDelete={() => setConfirmar({ id: p.id, numero: p.numero })}
                onPrint={() => setPrintPedido(p)}
                onUpdateEtapa={(novaEtapa) => handleUpdateEtapa(p.id, novaEtapa)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card overflow-hidden shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-medium pl-5 pr-4 py-3 min-w-[320px]">Produto</th>
                    <th className="text-left font-medium px-4 py-3">Cliente</th>
                    <th className="text-left font-medium px-4 py-3">Etapa</th>
                    <th className="text-right font-medium px-4 py-3">Financeiro</th>
                    <th className="text-left font-medium px-4 py-3">Entrega</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtrados.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">
                      Nenhum pedido encontrado.
                    </td></tr>
                  )}
                  {itensPaginados.map((p) => {
                    const atrasado = new Date(p.entrega) < new Date() && p.etapa !== "entregue";
                    const pct = (p.valorPago / p.valorTotal) * 100;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => navigate({ to: "/pedidos/$pedidoId", params: { pedidoId: p.id } })}
                        className="hover:bg-accent/40 transition cursor-pointer"
                      >
                        <td className="pl-0 pr-4 py-3.5">
                          <div className="flex items-stretch gap-3">
                            <span
                              className={`w-1 rounded-r-full ${
                                  p.prioridade === 'baixa' ? "bg-muted-foreground/30" :
                                  p.prioridade === 'media' ? "bg-info" :
                                  p.prioridade === 'alta' ? "bg-warning" : "bg-destructive"
                              }`}
                            />
                            <div className="min-w-0 flex-1 py-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium truncate">
                                  {p.produto} - <span className="text-muted-foreground font-normal">Cliente: {p.clientes?.nome || p.cliente}</span>
                                </span>
                                <span className="text-[11px] text-muted-foreground tabular-nums">{p.numero}</span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PRIORIDADE_COR[p.prioridade]}`}>
                                  {PRIORIDADE_LABEL[p.prioridade]}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium truncate max-w-[180px]">{p.cliente}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs px-2 py-1 bg-muted rounded-md border">{ETAPAS.find(e=>e.id===p.etapa)?.label}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="tabular-nums font-medium">{moeda(p.valorTotal)}</div>
                          <div className="mt-1 h-1 w-24 ml-auto rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className={`px-4 py-3.5 text-sm tabular-nums ${atrasado ? "text-destructive font-medium" : ""}`}>
                          {dataBR(p.entrega)}
                        </td>
                        <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => editar(p)} className="size-8 grid place-items-center hover:bg-accent rounded-md"><Pencil className="size-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-2 py-2">
              <p className="text-xs text-muted-foreground">
                Mostrando <span className="font-semibold text-foreground">{(pagina - 1) * itensPorPagina + 1}</span> a{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(pagina * itensPorPagina, filtrados.length)}
                </span>{" "}
                de <span className="font-semibold text-foreground">{filtrados.length}</span> pedidos
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagina((prev) => Math.max(prev - 1, 1))}
                  disabled={pagina === 1}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border bg-card text-muted-foreground hover:text-foreground disabled:opacity-50 transition-opacity"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-xs font-medium">
                  Página {pagina} de {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((prev) => Math.min(prev + 1, totalPaginas))}
                  disabled={pagina === totalPaginas}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border bg-card text-muted-foreground hover:text-foreground disabled:opacity-50 transition-opacity"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <NovoPedidoDialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)} initial={edit} />

      <PedidoViewerDialog
        pedido={viewing}
        onClose={() => setViewing(null)}
        onEdit={viewing ? () => { editar(viewing); setViewing(null); } : undefined}
      />

      {confirmar && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={() => setConfirmar(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-[var(--shadow-elevated)]">
            <h3 className="font-semibold tracking-tight">Remover pedido {confirmar.numero}?</h3>
            <p className="text-sm text-muted-foreground mt-1">Essa ação não pode ser desfeita. Pagamentos e histórico de etapas também serão apagados.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmar(null)} className="h-9 px-4 rounded-lg border text-sm hover:bg-accent">Cancelar</button>
              <button onClick={apagar} disabled={del.isPending} className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {del.isPending && <Loader2 className="size-4 animate-spin" />} Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {quitarSaldo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={() => setQuitarSaldo(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-[var(--shadow-elevated)] animate-in fade-in zoom-in-95">
            <h3 className="font-semibold tracking-tight">Quitar Saldo Restante?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              O pedido <strong>{quitarSaldo.numero}</strong> foi avançado. Deseja quitar o saldo restante de <strong>{moeda(quitarSaldo.saldo)}</strong> agora?
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setQuitarSaldo(null)} className="h-9 px-4 rounded-lg border text-sm hover:bg-accent">Não, depois</button>
              <button onClick={handleQuitarSaldo} disabled={addPagamento.isPending} className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {addPagamento.isPending && <Loader2 className="size-4 animate-spin" />} Sim, quitar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="hidden">
        <PrintableReceipt ref={printRef} pedido={printPedido} config={config} />
      </div>
    </AppShell>
  );
}

