import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Pagamento {
  id: string;
  pedido_id: string;
  valor: number;
  forma: string | null;
  pago_em: string;
  observacao: string | null;
  created_at: string;
}

export function usePagamentos() {
  return useQuery({
    queryKey: ["pagamentos"],
    queryFn: async () => {
      // Retorna array vazio devido à remoção da tabela pagamentos no banco de dados.
      return [];
    },
  });
}
