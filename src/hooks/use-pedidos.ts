import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Pedido, StatusEtapa, Prioridade } from "@/lib/mock-data";

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
  observacoes: string | null;
  created_at: string;
  cliente_id: string;
  clientes: { nome: string; telefone: string | null; cidade: string | null; email: string | null } | null;
};

function mapRow(r: Row): Pedido & { observacoes?: string; clienteId: string; email?: string } {
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
    observacoes: r.observacoes ?? "",
    clienteId: r.cliente_id,
    email: r.clientes?.email ?? "",
  };
}

export function usePedidos() {
  return useQuery({
    queryKey: ["pedidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero, produto, tipo, material, cor, valor_total, valor_pago, entrega, etapa, prioridade, observacoes, created_at, cliente_id, clientes(nome, telefone, cidade, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Row[]).map(mapRow);
    },
  });
}

export function useUpdatePedidoEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, etapa, observacao }: { id: string; etapa: StatusEtapa; observacao?: string }) => {
      const { data: atual } = await supabase
        .from("pedidos")
        .select("etapa")
        .eq("id", id)
        .single();
      const anterior = (atual?.etapa as StatusEtapa | undefined) ?? null;
      if (anterior === etapa) return;
      const { error } = await supabase.from("pedidos").update({ etapa }).eq("id", id);
      if (error) throw error;
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("etapas_pedido").insert({
        pedido_id: id,
        etapa_anterior: anterior,
        etapa_nova: etapa,
        autor_id: u.user?.id ?? null,
        observacao: observacao ?? null,
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["etapas_pedido", vars.id] });
    },
  });
}

export function useEtapasHistorico(pedidoId: string | undefined) {
  return useQuery({
    queryKey: ["etapas_pedido", pedidoId],
    enabled: !!pedidoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etapas_pedido")
        .select("id, etapa_anterior, etapa_nova, observacao, created_at, autor_id")
        .eq("pedido_id", pedidoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePagamentosPedido(pedidoId: string | undefined) {
  return useQuery({
    queryKey: ["pagamentos", pedidoId],
    enabled: !!pedidoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id, valor, forma, pago_em, observacao, created_at")
        .eq("pedido_id", pedidoId!)
        .order("pago_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePedido(id: string | undefined) {
  return useQuery({
    queryKey: ["pedido", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero, produto, tipo, material, cor, valor_total, valor_pago, entrega, etapa, prioridade, observacoes, created_at, cliente_id, clientes(nome, telefone, cidade, email)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return mapRow(data as unknown as Row);
    },
  });
}

export interface NovoPedidoInput {
  // cliente
  cliente_id?: string;
  cliente_nome: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  // produto
  produto: string;
  tipo?: string;
  material?: string;
  cor?: string;
  observacoes?: string;
  // entrega
  entrega?: string; // YYYY-MM-DD
  prioridade: Prioridade;
  etapa: StatusEtapa;
  // financeiro
  valor_total: number;
  valor_pago: number;
}

export function useCreatePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovoPedidoInput) => {
      let clienteId = input.cliente_id;
      if (!clienteId) {
        const { data: cli, error: e1 } = await supabase
          .from("clientes")
          .insert({
            nome: input.cliente_nome,
            telefone: input.telefone || null,
            email: input.email || null,
            cidade: input.cidade || null,
          })
          .select("id")
          .single();
        if (e1) throw e1;
        clienteId = cli.id;
      }

      const { data: pedido, error: e2 } = await supabase
        .from("pedidos")
        .insert({
          cliente_id: clienteId,
          produto: input.produto,
          tipo: input.tipo || null,
          material: input.material || null,
          cor: input.cor || null,
          observacoes: input.observacoes || null,
          entrega: input.entrega || null,
          etapa: input.etapa,
          prioridade: input.prioridade,
          valor_total: input.valor_total,
          valor_pago: input.valor_pago,
          numero: "",
        })
        .select("id")
        .single();
      if (e2) throw e2;

      if (input.valor_pago > 0) {
        await supabase.from("pagamentos").insert({
          pedido_id: pedido.id,
          valor: input.valor_pago,
          forma: "Entrada",
        });
      }
      return pedido.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}

export function useUpdatePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: NovoPedidoInput & { id: string }) => {
      // Update client data alongside order if cliente_id present
      if (input.cliente_id) {
        const { error: ec } = await supabase
          .from("clientes")
          .update({
            nome: input.cliente_nome,
            telefone: input.telefone || null,
            email: input.email || null,
            cidade: input.cidade || null,
          })
          .eq("id", input.cliente_id);
        if (ec) throw ec;
      }
      const { error } = await supabase
        .from("pedidos")
        .update({
          produto: input.produto,
          tipo: input.tipo || null,
          material: input.material || null,
          cor: input.cor || null,
          observacoes: input.observacoes || null,
          entrega: input.entrega || null,
          etapa: input.etapa,
          prioridade: input.prioridade,
          valor_total: input.valor_total,
          valor_pago: input.valor_pago,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedido", v.id] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}

export function useDuplicatePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: p, error } = await supabase
        .from("pedidos")
        .select("cliente_id, produto, tipo, material, cor, observacoes, entrega, etapa, prioridade, valor_total")
        .eq("id", id)
        .single();
      if (error) throw error;
      const { data: novo, error: e2 } = await supabase
        .from("pedidos")
        .insert({
          cliente_id: p.cliente_id,
          produto: p.produto,
          tipo: p.tipo,
          material: p.material,
          cor: p.cor,
          observacoes: p.observacoes,
          entrega: p.entrega,
          etapa: "pedido-recebido",
          prioridade: p.prioridade,
          valor_total: p.valor_total,
          valor_pago: 0,
          numero: "",
        })
        .select("id")
        .single();
      if (e2) throw e2;
      return novo.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}

export function useReagendarEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entrega }: { id: string; entrega: string }) => {
      const { error } = await supabase.from("pedidos").update({ entrega }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedido", v.id] });
    },
  });
}

export function useAddPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pedido_id, valor, forma, pago_em, observacao }: { pedido_id: string; valor: number; forma?: string; pago_em?: string; observacao?: string }) => {
      const { error } = await supabase.from("pagamentos").insert({
        pedido_id,
        valor,
        forma: forma || null,
        pago_em: pago_em || new Date().toISOString().slice(0, 10),
        observacao: observacao || null,
      });
      if (error) throw error;
      // increment valor_pago atomically via re-read
      const { data: p } = await supabase.from("pedidos").select("valor_pago").eq("id", pedido_id).single();
      const novoPago = Number(p?.valor_pago ?? 0) + valor;
      await supabase.from("pedidos").update({ valor_pago: novoPago }).eq("id", pedido_id);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["pagamentos"] });
      qc.invalidateQueries({ queryKey: ["pagamentos", v.pedido_id] });
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedido", v.pedido_id] });
    },
  });
}

export function useDeletePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("pagamentos").delete().eq("pedido_id", id);
      await supabase.from("etapas_pedido").delete().eq("pedido_id", id);
      const { error } = await supabase.from("pedidos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}
