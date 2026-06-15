import { useState } from "react";
import { X, Wallet, ClipboardList, Phone, Mail, MapPin, Calendar, Paperclip, FileText, Pencil, AlertTriangle, Plus, Loader2, History, Activity, CheckCircle2, Circle } from "lucide-react";
import { ETAPAS, moeda, dataBR, PRIORIDADE_LABEL, PRIORIDADE_COR } from "@/lib/mock-data";
import { usePagamentosPedido, useAddPagamento, useEtapasHistorico } from "@/hooks/use-pedidos";
import { toast } from "sonner";
import { formatObservacoes } from "@/lib/utils";

// ─── Funções puras — sem recriação a cada render ───────────────────────────────

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

function formatDateBR(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface PedidoViewerDialogProps {
  pedido: any | null;
  onClose: () => void;
  onEdit?: () => void;
}

export function PedidoViewerDialog({ pedido: p, onClose, onEdit }: PedidoViewerDialogProps) {
  if (!p) return null;

  return <PedidoViewerContent pedido={p} onClose={onClose} onEdit={onEdit} />;
}

// Componente separado para evitar hook condicional
function PedidoViewerContent({
  pedido: p,
  onClose,
  onEdit,
}: {
  pedido: any;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const etapa = ETAPAS.find((e) => e.id === p.etapa);
  const atrasado = p.entrega && new Date(p.entrega) < new Date() && p.etapa !== "entregue";
  const diasFalta = p.entrega
    ? Math.ceil((+new Date(p.entrega) - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // ── Histórico de etapas ───────────────────────────────────────────────────
  const { data: etapasLog = [], isLoading: loadingEtapas } = useEtapasHistorico(p.id);

  // ── Estado do formulário de novo pagamento ────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [novoValor, setNovoValor] = useState("");
  const [novaData, setNovaData] = useState(new Date().toISOString().split("T")[0]);
  const [novaForma, setNovaForma] = useState("");

  // ── Dados do histórico de pagamentos ─────────────────────────────────────
  const { data: pagamentos = [], isLoading: loadingPag } = usePagamentosPedido(p.id);
  const addPagamento = useAddPagamento();

  // valor_pago local reativo: soma dos pagamentos registrados (fonte de verdade)
  const valorPagoLocal = pagamentos.reduce((acc, pg) => acc + Number(pg.valor), 0);
  // Usa o maior entre o que vem do pedido e a soma dos pagamentos (segurança)
  const valorPago = Math.max(Number(p.valorPago ?? 0), valorPagoLocal);
  const saldo = Math.max(0, (p.valorTotal ?? 0) - valorPago);
  const pct = p.valorTotal > 0 ? Math.min(100, Math.round((valorPago / p.valorTotal) * 100)) : 0;

  const handleSalvarPagamento = async () => {
    const valor = Number(novoValor);
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }
    if (valor > saldo + 0.01) {
      toast.error("O valor informado é maior que o saldo devedor.");
      return;
    }
    try {
      await addPagamento.mutateAsync({
        pedido_id: p.id,
        valor,
        forma: novaForma || undefined,
        pago_em: novaData,
      });
      toast.success("Pagamento registrado com sucesso!");
      setNovoValor("");
      setNovaForma("");
      setNovaData(new Date().toISOString().split("T")[0]);
      setShowForm(false);
    } catch (err: any) {
      toast.error("Erro ao registrar pagamento", { description: err?.message ?? "" });
    }
  };

  return (
    /* BACKDROP */
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl bg-card border shadow-[var(--shadow-elevated)] my-8 overflow-hidden"
      >
        {/* CABEÇALHO */}
        <div className="flex items-start justify-between px-6 py-4 border-b bg-card/50">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {etapa && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${etapa.cor} 14%, transparent)`,
                    color: etapa.cor,
                  }}
                >
                  {etapa.label}
                </span>
              )}
              {p.prioridade && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PRIORIDADE_COR[p.prioridade as keyof typeof PRIORIDADE_COR]}`}>
                  {PRIORIDADE_LABEL[p.prioridade as keyof typeof PRIORIDADE_LABEL]}
                </span>
              )}
              {atrasado && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle className="size-3" /> Atrasado
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold tracking-tight mt-1">
              {`Pedido #${p.numero?.toString().startsWith('#') ? p.numero.slice(1) : p.numero || p.id} — ${p.clientes?.nome || p.cliente || "Cliente não informado"}`}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            {onEdit && (
              <button
                onClick={onEdit}
                title="Editar pedido"
                className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border text-sm hover:bg-accent transition-colors"
              >
                <Pencil className="size-3.5" />
                Editar
              </button>
            )}
            <button
              onClick={onClose}
              className="size-8 grid place-items-center rounded-lg hover:bg-accent transition-colors"
              title="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* CORPO */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto">

          {/* BLOCO: CLIENTE & ENTREGA */}
          <section className="rounded-xl border bg-muted/20 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="size-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente & Entrega</h3>
            </div>
            <p className="font-semibold">{p.clientes?.nome || p.cliente || "—"}</p>
            {p.telefone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-3.5 shrink-0" /> {p.telefone}
              </p>
            )}
            {p.email && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-3.5 shrink-0" /> {p.email}
              </p>
            )}
            {(p.endereco || p.cidade || p.cep) && (
              <div className="flex items-start gap-2 text-muted-foreground pt-1">
                <MapPin className="size-3.5 mt-0.5 shrink-0 text-muted-foreground/70" />
                <div className="text-xs leading-relaxed whitespace-pre-line">
                  {p.endereco ? (
                    <>
                      <span className="font-semibold text-foreground">{p.endereco}</span>
                      {p.numero_endereco && `, ${p.numero_endereco}`}
                      {p.complemento && ` (${p.complemento})`}
                      {p.bairro && <><br />{p.bairro}</>}
                      {(p.cidade || p.cep) && (
                        <>
                          <br />
                          {p.cidade}
                          {p.cep && ` - CEP: ${p.cep}`}
                        </>
                      )}
                    </>
                  ) : (
                    p.cidade
                  )}
                </div>
              </div>
            )}
            {p.entrega && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Entrega:</span>
                <span className={`font-medium tabular-nums ${atrasado ? "text-destructive" : ""}`}>
                  {dataBR(p.entrega)}
                </span>
              </div>
            )}
            {diasFalta !== null && (
              <p className="text-xs text-muted-foreground pl-5">
                {atrasado
                  ? `Atrasado em ${Math.abs(diasFalta)} dia(s)`
                  : `Faltam ${diasFalta} dia(s)`}
              </p>
            )}
          </section>

          {/* BLOCO: FINANCEIRO + HISTÓRICO DE PAGAMENTOS */}
          <section className="rounded-xl border bg-muted/20 p-4 text-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumo Financeiro</h3>
            </div>

            {/* Métricas */}
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor total</span>
                <span className="font-medium tabular-nums">{moeda(p.valorTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total pago</span>
                <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{moeda(valorPago)}</span>
              </div>
              <div className="flex justify-between border-t pt-2.5">
                <span className="text-muted-foreground">Saldo devedor</span>
                <span className={`font-semibold tabular-nums ${saldo > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {moeda(saldo)}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso de pagamento</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>

            {/* Botão + Registrar Pagamento (somente se houver saldo) */}
            {saldo > 0 && (
              <button
                onClick={() => setShowForm((v) => !v)}
                className="mt-1 h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 transition-colors w-full justify-center"
              >
                <Plus className="size-3.5" />
                {showForm ? "Cancelar" : "Registrar Pagamento"}
              </button>
            )}

            {/* Formulário inline de novo pagamento */}
            {showForm && saldo > 0 && (
              <div className="rounded-xl border bg-background p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Novo Pagamento</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">Valor (R$) *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0,00"
                      value={novoValor}
                      onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
                      onChange={(e) => setNovoValor(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">Data *</label>
                    <input
                      type="date"
                      value={novaData}
                      onChange={(e) => setNovaData(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">Forma de pagamento</label>
                  <select
                    value={novaForma}
                    onChange={(e) => setNovaForma(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">Selecione...</option>
                    <option value="Pix">Pix</option>
                    <option value="Cartão de crédito">Cartão de crédito</option>
                    <option value="Cartão de débito">Cartão de débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Boleto">Boleto</option>
                  </select>
                </div>
                <button
                  onClick={handleSalvarPagamento}
                  disabled={addPagamento.isPending}
                  className="w-full h-8 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-60 transition"
                >
                  {addPagamento.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  {addPagamento.isPending ? "Salvando..." : "Salvar Pagamento"}
                </button>
              </div>
            )}

            {/* Histórico de Recebimentos */}
            <div className="border-t pt-3 mt-1">
              <div className="flex items-center gap-1.5 mb-2">
                <History className="size-3.5 text-muted-foreground" />
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Histórico de Recebimentos
                </p>
              </div>

              {loadingPag ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : pagamentos.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum pagamento registrado.</p>
              ) : (
                <ul className="space-y-1.5">
                  {pagamentos.map((pg) => (
                    <li
                      key={pg.id}
                      className="flex items-center justify-between text-xs rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-2.5 py-1.5"
                    >
                      <span className="text-muted-foreground tabular-nums">
                        {(() => {
                          const d = pg.pago_em;
                          if (!d) return new Date().toLocaleDateString("pt-BR");
                          if (typeof d === "string" && !d.includes("T")) {
                            const parts = d.split("-");
                            if (parts.length === 3) {
                              return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString("pt-BR");
                            }
                          }
                          return new Date(d).toLocaleDateString("pt-BR");
                        })()}
                        {pg.forma && (
                          <span className="ml-1.5 text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-medium text-muted-foreground">
                            {pg.forma}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        + {moeda(Number(pg.valor))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* BLOCO: LINHA DO TEMPO DE PRODUÇÃO */}
          <section className="rounded-xl border bg-muted/20 p-4 text-sm md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="size-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Linha do Tempo de Produção</h3>
            </div>

            {loadingEtapas ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ProducaoTimeline etapasLog={etapasLog} etapaAtual={p.etapa} />
            )}
          </section>

          {/* BLOCO: ESPECIFICAÇÕES DO PRODUTO */}
          <section className="rounded-xl border bg-muted/20 p-4 text-sm md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Especificações do Produto</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <Row label="Produto" value={p.produto} />
              <Row label="Tipo" value={p.tipo} />
              <Row
                label="Material"
                value={
                  p.material
                    ? ([...new Set(p.material.split(",").map((m: string) => m.trim()))] as string[])
                        .filter(Boolean)
                        .map((m: string) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
                        .join(", ")
                    : null
                }
              />
              <Row label="Cor / Acabamento" value={p.cor} />
            </dl>
            {p.observacoes && (
              <div className="mt-3 pt-3 border-t">
                <dt className="text-xs text-muted-foreground mb-1">Observações / Medidas</dt>
                <dd className="whitespace-pre-wrap text-sm leading-relaxed">{formatObservacoes(p.observacoes)}</dd>
              </div>
            )}
          </section>

          {/* BLOCO: ANEXOS */}
          {p.anexos && p.anexos.length > 0 && (
            <section className="rounded-xl border bg-muted/20 p-4 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Anexos do Projeto ({p.anexos.length})
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {p.anexos.map((url: string, idx: number) => {
                  const isImg = isImageUrl(url);
                  const name = getFileNameFromUrl(url);
                  return (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      title={name}
                      className="relative group rounded-xl border bg-card hover:bg-accent/40 hover:border-primary/30 transition-all overflow-hidden aspect-video flex flex-col items-center justify-center p-2 shadow-sm cursor-pointer"
                    >
                      {isImg ? (
                        <img src={url} alt={name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-1">
                          <FileText className="size-7 text-destructive/80 mb-1" />
                          <span className="text-[10px] font-medium truncate max-w-[100px] text-muted-foreground">
                            {name}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-xl" />
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-card/50">
          <p className="text-xs text-muted-foreground">
            {p.criadoEm ? `Criado em ${new Date(p.criadoEm).toLocaleDateString("pt-BR")}` : ""}
          </p>
          <button
            onClick={onClose}
            className="h-9 px-5 rounded-lg border text-sm hover:bg-accent transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right truncate font-medium">{value}</dd>
    </div>
  );
}

// ─── Linha do Tempo de Produção ───────────────────────────────────────────────

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface EtapaLogEntry {
  id: string;
  etapa_anterior: string | null;
  etapa_nova: string;
  observacao: string | null;
  created_at: string;
}

function ProducaoTimeline({
  etapasLog,
  etapaAtual,
}: {
  etapasLog: EtapaLogEntry[];
  etapaAtual: string;
}) {
  // Constrói a lista ordenada de todas as etapas do processo
  const registradas = new Set(etapasLog.map((e) => e.etapa_nova));

  // Índice atual dentro da sequência oficial de etapas
  const idxAtual = ETAPAS.findIndex((e) => e.id === etapaAtual);

  // Se não há nenhum histórico ainda, mostra apenas a etapa atual como "Iniciado"
  if (etapasLog.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Nenhuma transição de etapa registrada. As próximas mudanças aparecerão aqui.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0" aria-label="Linha do tempo de produção">
      {ETAPAS.map((etapa, idx) => {
        const logEntry = [...etapasLog].reverse().find((e) => e.etapa_nova === etapa.id);
        const isCompleted = registradas.has(etapa.id) && idx <= idxAtual;
        const isCurrent = etapa.id === etapaAtual;
        const isPending = idx > idxAtual;
        const isLast = idx === ETAPAS.length - 1;

        return (
          <li key={etapa.id} className="flex gap-3 min-h-[48px]">
            {/* Coluna do ícone + linha vertical */}
            <div className="flex flex-col items-center">
              <div
                className={`relative z-10 flex items-center justify-center size-6 rounded-full border-2 shrink-0 transition-all ${
                  isCurrent
                    ? "border-primary bg-primary shadow-sm shadow-primary/30"
                    : isCompleted
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-muted-foreground/25 bg-background"
                }`}
              >
                {isCurrent ? (
                  <span className="size-2 rounded-full bg-primary-foreground" />
                ) : isCompleted ? (
                  <CheckCircle2 className="size-3.5 text-white" />
                ) : (
                  <Circle className="size-3 text-muted-foreground/30" />
                )}
              </div>
              {/* Linha vertical conectora */}
              {!isLast && (
                <div
                  className={`w-px flex-1 mt-0.5 ${
                    isCompleted && idx < idxAtual
                      ? "bg-emerald-500/50"
                      : "bg-border"
                  }`}
                />
              )}
            </div>

            {/* Conteúdo textual */}
            <div className={`pb-4 flex-1 ${isLast ? "pb-0" : ""}`}>
              <p
                className={`text-sm font-medium leading-tight ${
                  isCurrent
                    ? "text-primary"
                    : isCompleted
                    ? "text-foreground"
                    : "text-muted-foreground/50"
                }`}
              >
                {etapa.label}
              </p>
              {logEntry ? (
                <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                  {formatDateTime(logEntry.created_at)}
                  {logEntry.observacao && (
                    <span className="ml-1.5 italic opacity-70">— {logEntry.observacao}</span>
                  )}
                </p>
              ) : isCurrent ? (
                <p className="text-[11px] text-primary/70 mt-0.5 font-medium">Em andamento</p>
              ) : isPending ? (
                <p className="text-[11px] text-muted-foreground/40 mt-0.5">Pendente</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
