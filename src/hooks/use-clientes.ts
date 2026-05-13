import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClienteInput {
  nome: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  observacoes?: string;
}

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, telefone, email, cidade, observacoes, created_at, updated_at")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
  });
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: ["cliente", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, telefone, email, cidade, observacoes, created_at, updated_at")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Cliente;
    },
  });
}

export function usePedidosCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["pedidos-cliente", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero, produto, valor_total, valor_pago, entrega, etapa, prioridade, created_at")
        .eq("cliente_id", clienteId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        valor_total: Number(p.valor_total),
        valor_pago: Number(p.valor_pago),
      }));
    },
  });
}

export function usePagamentosCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["pagamentos-cliente", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("id, numero")
        .eq("cliente_id", clienteId!);
      const ids = (pedidos ?? []).map((p) => p.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id, pedido_id, valor, forma, pago_em, observacao")
        .in("pedido_id", ids)
        .order("pago_em", { ascending: false });
      if (error) throw error;
      const numByPedido = new Map((pedidos ?? []).map((p) => [p.id, p.numero]));
      return (data ?? []).map((pg) => ({
        ...pg,
        valor: Number(pg.valor),
        pedido_numero: numByPedido.get(pg.pedido_id) ?? "",
      }));
    },
  });
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClienteInput) => {
      const { data, error } = await supabase
        .from("clientes")
        .insert({
          nome: input.nome,
          telefone: input.telefone || null,
          email: input.email || null,
          cidade: input.cidade || null,
          observacoes: input.observacoes || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ClienteInput & { id: string }) => {
      const { error } = await supabase
        .from("clientes")
        .update({
          nome: input.nome,
          telefone: input.telefone || null,
          email: input.email || null,
          cidade: input.cidade || null,
          observacoes: input.observacoes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["cliente", vars.id] });
      qc.invalidateQueries({ queryKey: ["pedidos"] });
    },
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Bloqueia se houver pedidos vinculados
      const { count, error: cErr } = await supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", id);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        throw new Error(
          `Cliente possui ${count} pedido(s) vinculado(s). Remova os pedidos antes.`,
        );
      }
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}
