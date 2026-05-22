import { MessageCircle, Pencil, Copy, Trash2, Printer } from "lucide-react";
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

export function PedidoCard({ p, onClick, onEdit, onDuplicate, onDelete, onPrint, isDragging, innerRef, wrapperProps, dragHandleProps }: PedidoCardProps) {
  const atrasado = new Date(p.entrega) < new Date() && p.etapa !== "entregue";
  const saldo = p.valorTotal - p.valorPago;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendWhatsAppMessage(p);
  };

  return (
    <div
      ref={innerRef}
      {...wrapperProps}
      {...dragHandleProps}
      className={`bg-card border rounded-xl p-4 mb-3 shadow-sm select-none group relative transition-colors cursor-pointer
        ${isDragging ? "shadow-lg ring-2 ring-primary ring-offset-1 border-transparent z-50" : "hover:border-primary/40"}
      `}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <div>
          <span className="text-xs font-semibold text-muted-foreground">{p.numero}</span>
          <h4 className="font-medium text-sm leading-tight mt-0.5 line-clamp-2">{p.produto}</h4>
        </div>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${PRIORIDADE_COR[p.prioridade as keyof typeof PRIORIDADE_COR]}`}>
          {PRIORIDADE_LABEL[p.prioridade as keyof typeof PRIORIDADE_LABEL]}
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground truncate mb-2">{p.cliente}</p>

      <div className="flex items-center justify-between mb-3">
         <span className="text-xs font-medium text-muted-foreground">Saldo Devedor:</span>
         <span className={`text-xs font-semibold ${saldo > 0 ? "text-destructive" : "text-success"}`}>{moeda(saldo)}</span>
      </div>
      
      <div className="flex items-center justify-between mt-auto pt-3 border-t">
        <span className={`text-[11px] font-medium ${atrasado ? "text-destructive" : "text-muted-foreground"}`}>
          {dataBR(p.entrega)}
        </span>
        <span className="text-xs font-semibold">{moeda(p.valorTotal)}</span>
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity bg-card/80 backdrop-blur-sm p-1 rounded-lg">
         <button title="Avisar Cliente" onClick={handleWhatsApp} className="size-6 grid place-items-center rounded hover:bg-success/15 text-success"><MessageCircle className="size-3" /></button>
         {onPrint && <button title="Gerar PDF" onClick={(e) => { e.stopPropagation(); onPrint(); }} className="size-6 grid place-items-center rounded hover:bg-accent text-slate-600 dark:text-slate-300"><Printer className="size-3" /></button>}
         {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="size-6 grid place-items-center rounded hover:bg-accent"><Pencil className="size-3" /></button>}
         {onDuplicate && <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="size-6 grid place-items-center rounded hover:bg-accent"><Copy className="size-3" /></button>}
         {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="size-6 grid place-items-center rounded hover:bg-destructive/10 text-destructive"><Trash2 className="size-3" /></button>}
      </div>
    </div>
  );
}
