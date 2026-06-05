import { X, Wallet, ClipboardList, Phone, Mail, MapPin, Calendar, Paperclip, FileText, Pencil, AlertTriangle } from "lucide-react";
import { ETAPAS, moeda, dataBR, PRIORIDADE_LABEL, PRIORIDADE_COR } from "@/lib/mock-data";

// Funções puras — sem recriação a cada render
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

interface PedidoViewerDialogProps {
  pedido: any | null;
  onClose: () => void;
  onEdit?: () => void;
}

export function PedidoViewerDialog({ pedido: p, onClose, onEdit }: PedidoViewerDialogProps) {
  if (!p) return null;

  const etapa = ETAPAS.find((e) => e.id === p.etapa);
  const saldo = (p.valorTotal ?? 0) - (p.valorPago ?? 0);
  const pct = p.valorTotal > 0 ? Math.round((p.valorPago / p.valorTotal) * 100) : 0;
  const atrasado = p.entrega && new Date(p.entrega) < new Date() && p.etapa !== "entregue";
  const diasFalta = p.entrega
    ? Math.ceil((+new Date(p.entrega) - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    /* BACKDROP — sem onClick para não fechar ao clicar fora */
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl bg-card border shadow-[var(--shadow-elevated)] my-8 overflow-hidden"
      >
        {/* CABEÇALHO */}
        <div className="flex items-start justify-between px-6 py-4 border-b bg-card/50">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">{p.numero}</span>
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
              {p.produto || "Produto não informado"}
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

          {/* BLOCO: FINANCEIRO */}
          <section className="rounded-xl border bg-muted/20 p-4 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="size-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumo Financeiro</h3>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor total</span>
                <span className="font-medium tabular-nums">{moeda(p.valorTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pago</span>
                <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{moeda(p.valorPago)}</span>
              </div>
              <div className="flex justify-between border-t pt-2.5">
                <span className="text-muted-foreground">Saldo devedor</span>
                <span className={`font-semibold tabular-nums ${saldo > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {moeda(saldo)}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso de pagamento</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </section>

          {/* BLOCO: ESPECIFICAÇÕES DO PRODUTO */}
          <section className="rounded-xl border bg-muted/20 p-4 text-sm md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Especificações do Produto</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <Row label="Produto" value={p.produto} />
              <Row label="Tipo" value={p.tipo} />
              <Row label="Material" value={p.material} />
              <Row label="Cor / Acabamento" value={p.cor} />
            </dl>
            {p.observacoes && (
              <div className="mt-3 pt-3 border-t">
                <dt className="text-xs text-muted-foreground mb-1">Observações / Medidas</dt>
                <dd className="whitespace-pre-wrap text-sm leading-relaxed">{p.observacoes}</dd>
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
                        <img
                          src={url}
                          alt={name}
                          className="w-full h-full object-cover rounded-lg"
                        />
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

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right truncate font-medium">{value}</dd>
    </div>
  );
}
