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
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id, pedido_id, valor, forma, pago_em, observacao, created_at")
        .order("pago_em", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => ({ ...p, valor: Number(p.valor) })) as Pagamento[];
    },
  });
}
