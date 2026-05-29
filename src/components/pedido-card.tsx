import { MessageCircle, Pencil, Copy, Trash2, Printer, Paperclip, Eye, GripVertical } from "lucide-react";
import { ETAPAS, moeda, dataBR, PRIORIDADE_LABEL, PRIORIDADE_COR } from "@/lib/mock-data";
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
}

export function PedidoCard({
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

  return (
    <div
      ref={innerRef}
      {...wrapperProps}
      // dragHandleProps NÃO está aqui — evita que o DnD consuma o onClick do card
      className={`bg-card border rounded-xl mb-3 shadow-sm select-none group relative transition-colors
        ${isDragging ? "shadow-lg ring-2 ring-primary ring-offset-1 border-transparent z-50" : "hover:border-primary/40"}
      `}
    >
      {/* ── ALÇA DE ARRASTO (drag handle isolado) ───────────────────────────── */}
      {/* Os dragHandleProps ficam APENAS aqui, protegendo o restante do card   */}
      <div
        {...dragHandleProps}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        className="flex items-start gap-2 p-4 pb-2 cursor-grab active:cursor-grabbing"
        title="Arraste para mover"
      >
        <GripVertical className="size-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-muted-foreground">{p.numero}</span>
          <h4 className="font-medium text-sm leading-tight mt-0.5 line-clamp-2">
            {p.produto}
            {(p.clientes?.nome || p.cliente) && (
              <span className="text-muted-foreground font-normal">
                {" "}· {p.clientes?.nome || p.cliente}
              </span>
            )}
          </h4>
        </div>
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
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

      {/* ── BOTÕES DE AÇÃO (hover, zona segura com stopPropagation) ─────────── */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity bg-card/80 backdrop-blur-sm p-1 rounded-lg">
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
    </div>
  );
}
