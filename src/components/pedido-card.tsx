import React from "react";
import { MessageCircle, Pencil, Copy, Trash2, Printer, Paperclip, Eye, GripVertical } from "lucide-react";
import { ETAPAS, moeda, dataBR, PRIORIDADE_LABEL, PRIORIDADE_COR, type StatusEtapa } from "@/lib/mock-data";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

interface PedidoCardProps {
  p: any;
  onClick?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  isDragging?: boolean;
  innerRef?: any;
  wrapperProps?: any;
  dragHandleProps?: any;
  onUpdateEtapa?: (novaEtapa: StatusEtapa) => void;
}

const areEqual = (prevProps: PedidoCardProps, nextProps: PedidoCardProps) => {
  // Se o estado de arrasto mudou ou está ativamente arrastando, precisamos atualizar para aplicar transformações
  if (prevProps.isDragging !== nextProps.isDragging || nextProps.isDragging) {
    return false;
  }

  // Verifica se as propriedades de estilo de arrasto mudaram
  const s1 = prevProps.wrapperProps?.style;
  const s2 = nextProps.wrapperProps?.style;
  if (s1 !== s2) {
    if (!s1 || !s2) return false;
    if (
      s1.transform !== s2.transform ||
      s1.transition !== s2.transition ||
      s1.position !== s2.position ||
      s1.top !== s2.top ||
      s1.left !== s2.left
    ) {
      return false;
    }
  }

  return (
    prevProps.p.id === nextProps.p.id &&
    prevProps.p.numero === nextProps.p.numero &&
    prevProps.p.etapa === nextProps.p.etapa &&
    prevProps.p.prioridade === nextProps.p.prioridade &&
    prevProps.p.produto === nextProps.p.produto &&
    prevProps.p.cliente === nextProps.p.cliente &&
    prevProps.p.valorTotal === nextProps.p.valorTotal &&
    prevProps.p.valorPago === nextProps.p.valorPago &&
    prevProps.p.entrega === nextProps.p.entrega &&
    prevProps.p.anexos?.length === nextProps.p.anexos?.length
  );
};

export const PedidoCard = React.memo(function PedidoCard({
  p,
  onClick,
  onEdit,
  onDuplicate,
  onDelete,
  onPrint,
  isDragging,
  innerRef,
  wrapperProps,
  dragHandleProps,
  onUpdateEtapa,
}: PedidoCardProps) {
  const atrasado = p.entrega && new Date(p.entrega) < new Date() && p.etapa !== "entregue";
  const saldo = (p.valorTotal ?? 0) - (p.valorPago ?? 0);

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendWhatsAppMessage(p);
  };

  // Zona segura: para o DnD de capturar o evento de ponteiro antes do clique
  const safeClick = (e: React.MouseEvent, fn?: () => void) => {
    e.stopPropagation();
    fn?.();
  };

  const safePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  const currentIndex = ETAPAS.findIndex((e) => e.id === p.etapa);
  const proximaEtapa = currentIndex !== -1 && currentIndex < ETAPAS.length - 1 ? ETAPAS[currentIndex + 1] : null;

  return (
    <div
      ref={innerRef}
      {...wrapperProps}
      {...dragHandleProps}
      className={`bg-card border rounded-xl mb-3 shadow-sm select-none group relative transition-colors md:cursor-grab active:md:cursor-grabbing
        ${isDragging ? "shadow-lg ring-2 ring-primary ring-offset-1 border-transparent z-50 md:cursor-grabbing" : "hover:border-primary/40"}
      `}
      style={{
        ...wrapperProps?.style,
        ...dragHandleProps?.style,
        // 'none' é necessário para que o @hello-pangea/dnd capture
        // o ponteiro no mobile sem que o browser intercepte o gesto.
        // O scroll da coluna funciona porque o DnD só bloqueia o touch
        // no próprio elemento enquanto o arrasto está ativo.
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {/* ── CABEÇALHO DO CARD ────────────────────────────────────────────────── */}
      {/* Linha com alça de arrasto (apenas o ícone grip) + info do pedido       */}
      <div className="flex items-start gap-2 px-3 pt-3 pb-1">
        {/* ALÇA DE ARRASTO: área de toque maior no mobile, menor no desktop */}
        {/* CRÍTICO: não sobrescreva onPointerDown após o spread — o DnD usa esse evento para iniciar o arrasto */}
        <div
          className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing p-2.5 sm:p-0.5 rounded hover:bg-muted -ml-1 sm:ml-0"
          title="Arraste para mover"
        >
          <GripVertical className="size-5 sm:size-3.5 text-muted-foreground/40" />
        </div>

        {/* Conteúdo do header: clicável para abrir detalhes */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <span className="text-xs font-semibold text-muted-foreground">{p.numero}</span>
          <h4 className="font-bold text-sm leading-tight mt-0.5 text-foreground">
            {p.clientes?.nome || p.cliente || "Cliente não identificado"}
          </h4>
          <span className="w-full block truncate text-sm text-slate-500 mt-1" title={p.produto}>
            {p.produto}
          </span>
        </div>

        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 mt-0.5 ${
            PRIORIDADE_COR[p.prioridade as keyof typeof PRIORIDADE_COR]
          }`}
        >
          {PRIORIDADE_LABEL[p.prioridade as keyof typeof PRIORIDADE_LABEL]}
        </span>
      </div>

      {/* ── CORPO DO CARD (zona clicável, sem dragHandleProps) ──────────────── */}
      <div
        className="px-4 pb-4 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">Saldo Devedor:</span>
          <span className={`text-xs font-semibold ${saldo > 0 ? "text-destructive" : "text-success"}`}>
            {moeda(saldo)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-medium ${atrasado ? "text-destructive" : "text-muted-foreground"}`}>
              {dataBR(p.entrega)}
            </span>
            {p.anexos && p.anexos.length > 0 && (
              <span
                className="inline-flex items-center text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md"
                title={`${p.anexos.length} anexo(s)`}
              >
                <Paperclip className="size-3 mr-0.5" />
                {p.anexos.length}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold">{moeda(p.valorTotal)}</span>
        </div>
      </div>

      {/* ── BOTÕES DE AÇÃO ──────────────────────────────────────────────────── */}
      {/* Mobile: sempre visível (não há hover em touch). Desktop: só no hover   */}
      <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex gap-1 transition-opacity bg-card/80 backdrop-blur-sm p-1 rounded-lg">
        {/* BOTÃO VER — zona segura garantida com onPointerDown stopPropagation */}
        {onClick && (
          <button
            title="Ver detalhes"
            onClick={(e) => safeClick(e, onClick)}
            onPointerDown={safePointerDown}
            className="size-6 grid place-items-center rounded hover:bg-primary/10 text-primary"
          >
            <Eye className="size-3" />
          </button>
        )}
        <button
          title="Avisar Cliente"
          onClick={handleWhatsApp}
          onPointerDown={safePointerDown}
          className="size-6 grid place-items-center rounded hover:bg-success/15 text-success"
        >
          <MessageCircle className="size-3" />
        </button>
        {onPrint && (
          <button
            title="Gerar PDF"
            onClick={(e) => safeClick(e, onPrint)}
            onPointerDown={safePointerDown}
            className="size-6 grid place-items-center rounded hover:bg-accent text-slate-600 dark:text-slate-300"
          >
            <Printer className="size-3" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => safeClick(e, onEdit)}
            onPointerDown={safePointerDown}
            className="size-6 grid place-items-center rounded hover:bg-accent"
          >
            <Pencil className="size-3" />
          </button>
        )}
        {onDuplicate && (
          <button
            onClick={(e) => safeClick(e, onDuplicate)}
            onPointerDown={safePointerDown}
            className="size-6 grid place-items-center rounded hover:bg-accent"
          >
            <Copy className="size-3" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => safeClick(e, onDelete)}
            onPointerDown={safePointerDown}
            className="size-6 grid place-items-center rounded hover:bg-destructive/10 text-destructive"
          >
            <Trash2 className="size-3" />
          </button>
        )}
      </div>

      {/* ── AÇÕES DE MUDANÇA DE ETAPA (APENAS MOBILE) ──────────────────────── */}
      {onUpdateEtapa && (
        <div 
          className="px-4 pb-3 pt-2.5 border-t flex items-center justify-between gap-2 bg-muted/20"
          onClick={(e) => e.stopPropagation()} 
          onPointerDown={safePointerDown}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground hidden xs:inline shrink-0">Etapa:</span>
            <select
              value={p.etapa}
              onChange={(e) => onUpdateEtapa(e.target.value as StatusEtapa)}
              className="text-xs h-8 w-full max-w-[155px] rounded-lg border bg-card text-card-foreground px-2 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium cursor-pointer"
            >
              {ETAPAS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          {proximaEtapa && (
            <button
              onClick={() => onUpdateEtapa(proximaEtapa.id)}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1 shadow-sm shrink-0"
            >
              <span>Avançar</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}, areEqual);


