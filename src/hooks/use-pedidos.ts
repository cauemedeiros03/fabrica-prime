import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Pedido, StatusEtapa } from "@/lib/mock-data";

type Row = {
  id: string;
  numero: string;
  produto: string;
  tipo: string | null;
  material: string | null;
  cor: string | null;
  valor_total: number | string;
  valor_pago: number | string;
  entrega: string | null;
  etapa: StatusEtapa;
  prioridade: Pedido["prioridade"];
  created_at: string;
  clientes: { nome: string; telefone: string | null; cidade: string | null } | null;
};

function mapRow(r: Row): Pedido {
  return {
    id: r.id,
    numero: r.numero,
    cliente: r.clientes?.nome ?? "—",
    telefone: r.clientes?.telefone ?? "",
    cidade: r.clientes?.cidade ?? "",
    produto: r.produto,
    tipo: r.tipo ?? "",
    material: r.material ?? "",
    cor: r.cor ?? "",
    valorTotal: Number(r.valor_total),
    valorPago: Number(r.valor_pago),
    entrega: r.entrega ? new Date(r.entrega).toISOString() : new Date().toISOString(),
    criadoEm: r.created_at,
    etapa: r.etapa,
    prioridade: r.prioridade,
  };
}

export function usePedidos() {
  return useQuery({
    queryKey: ["pedidos"],
    queryFn: async (): Promise<Pedido[]> => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero, produto, tipo, material, cor, valor_total, valor_pago, entrega, etapa, prioridade, created_at, clientes(nome, telefone, cidade)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Row[]).map(mapRow);
    },
  });
}

export function useUpdatePedidoEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, etapa }: { id: string; etapa: StatusEtapa }) => {
      const { error } = await supabase.from("pedidos").update({ etapa }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}
