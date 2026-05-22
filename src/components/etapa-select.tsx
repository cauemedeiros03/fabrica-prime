import { ETAPAS, type StatusEtapa } from "@/lib/mock-data";
import { useUpdatePedidoEtapa } from "@/hooks/use-pedidos";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { sendWhatsAppMessage } from "@/lib/whatsapp";

interface Props {
  pedido: any;
  className?: string;
  variant?: "badge" | "default";
}

export function EtapaSelect({ pedido, className = "", variant = "default" }: Props) {
  const { id: pedidoId, etapa, numero } = pedido;
  const update = useUpdatePedidoEtapa();
  const atual = ETAPAS.find((e) => e.id === etapa);

  const onChange = async (nova: StatusEtapa) => {
    if (nova === etapa) return;
    try {
      await update.mutateAsync({ id: pedidoId, etapa: nova });
      const novaLabel = ETAPAS.find((e) => e.id === nova)?.label ?? nova;
      const pedidoAtualizado = { ...pedido, etapa: nova };
      
      toast.success(`Etapa atualizada${numero ? ` · ${numero}` : ""}`, {
        description: `Movido para "${novaLabel}".`,
        action: {
          label: "Avisar Cliente",
          onClick: () => sendWhatsAppMessage(pedidoAtualizado)
        }
      });
    } catch (e) {
      toast.error("Não foi possível atualizar", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    }
  };

  const baseStyle =
    variant === "badge" && atual
      ? {
          backgroundColor: `color-mix(in oklab, ${atual.cor} 14%, transparent)`,
          color: atual.cor,
          borderColor: `color-mix(in oklab, ${atual.cor} 30%, transparent)`,
        }
      : undefined;

  return (
    <div className={`relative inline-flex items-center ${className}`} onClick={(e) => e.stopPropagation()}>
      <select
        value={etapa}
        disabled={update.isPending}
        onChange={(e) => onChange(e.target.value as StatusEtapa)}
        style={baseStyle}
        className={
          variant === "badge"
            ? "appearance-none cursor-pointer text-[11px] font-medium pl-2.5 pr-6 py-1 rounded-full border bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
            : "appearance-none cursor-pointer text-sm pl-3 pr-8 h-9 rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
        }
      >
        {ETAPAS.map((e) => (
          <option key={e.id} value={e.id}>
            {e.label}
          </option>
        ))}
      </select>
      {update.isPending ? (
        <Loader2 className="size-3 animate-spin absolute right-2 pointer-events-none" />
      ) : (
        <svg
          className="size-3 absolute right-2 pointer-events-none opacity-60"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
