import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Limpa e formata a string de observações do pedido, removendo blocos JSON e formatando preços em padrão brasileiro */
export function formatObservacoes(obs: string | null | undefined): string {
  if (!obs) return "";
  
  if (obs.includes("===JSON_ITENS===")) {
    try {
      const parts = obs.split("===JSON_ITENS===\n");
      const cleanObsText = parts[0].replace(/\n*Itens do Pedido:\n[\s\S]*$/, "").trim();
      
      const jsonPart = parts[1].split("\n===END_JSON_ITENS===")[0];
      const items = JSON.parse(jsonPart);
      
      if (Array.isArray(items) && items.length > 0) {
        const itemsFormatted = items.map((item: any, index: number) => {
          const matPart = item.material ? ` (${item.material})` : "";
          const medPart = item.medidas ? ` - Medidas: ${item.medidas}` : "";
          
          let valPart = "";
          if (item.valor && Number(item.valor) > 0) {
            const valFormatted = Number(item.valor).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            valPart = ` - R$ ${valFormatted}`;
          }
          
          return `${index + 1}. ${item.descricao}${matPart}${medPart}${valPart}`;
        }).join("\n");
        
        return `${cleanObsText}${cleanObsText ? "\n\n" : ""}Itens do Pedido:\n${itemsFormatted}`;
      }
      return cleanObsText;
    } catch (e) {
      return obs.split("===JSON_ITENS===")[0].trim();
    }
  }
  
  return obs;
}
