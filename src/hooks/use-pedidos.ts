import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Pedido, StatusEtapa, Prioridade } from "@/lib/mock-data";
import { useAuth } from "@/hooks/use-auth";

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
  clientes: {
    nome: string;
    telefone: string | null;
    cidade: string | null;
    email: string | null;
    endereco: string | null;
    numero: string | null;
    bairro: string | null;
    cep: string | null;
    complemento: string | null;
    cpf: string | null;
    instagram: string | null;
    origem: string | null;
  } | null;
  anexos: string[] | null;
};

function mapRow(r: Row): Pedido & {
  observacoes?: string;
  clienteId: string;
  email?: string;
  clienteEndereco?: string;
  cpf?: string;
  cep?: string;
  endereco?: string;
  numero_endereco?: string;
  complemento?: string;
  bairro?: string;
  instagram?: string;
  origem?: string;
} {
  const c = r.clientes;
  const addressParts = c
    ? [
        c.endereco,
        c.numero,
        c.complemento ? `(${c.complemento})` : "",
        c.bairro,
        c.cidade,
        c.cep ? `CEP: ${c.cep}` : "",
      ].filter(Boolean)
    : [];

  return {
    id: r.id,
    numero: r.numero,
    cliente: c?.nome ?? "—",
    telefone: c?.telefone ?? "",
    cidade: c?.cidade ?? "",
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
    email: c?.email ?? "",
    clienteEndereco: addressParts.length > 0 ? addressParts.join(", ") : "Não informado",
    cpf: c?.cpf ?? "",
    cep: c?.cep ?? "",
    endereco: c?.endereco ?? "",
    numero_endereco: c?.numero ?? "",
    complemento: c?.complemento ?? "",
    bairro: c?.bairro ?? "",
    instagram: c?.instagram ?? "",
    origem: c?.origem ?? "",
    clientes: c ? { nome: c.nome } : null,
    anexos: Array.isArray(r.anexos) ? (r.anexos as string[]) : [],
  };
}

export function usePedidos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pedidos", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, clientes(nome, telefone, cidade, email, endereco, numero, bairro, cep, complemento, cpf, instagram, origem)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Erro na busca de pedidos (usePedidos):", error);
        throw error;
      }
      return (data as unknown as Row[]).map(mapRow);
    },
  });
}

export function useUpdatePedidoEtapa() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, etapa, observacao }: { id: string; etapa: StatusEtapa; observacao?: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data: atual } = await supabase
        .from("pedidos")
        .select("etapa")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      const anterior = (atual?.etapa as StatusEtapa | undefined) ?? null;
      if (anterior === etapa) return;
      const { error } = await supabase.from("pedidos").update({ etapa }).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      await supabase.from("etapas_pedido").insert({
        pedido_id: id,
        etapa_anterior: anterior,
        etapa_nova: etapa,
        autor_id: user.id,
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
  const { user } = useAuth();
  return useQuery({
    queryKey: ["etapas_pedido", pedidoId, user?.id],
    enabled: !!pedidoId && !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("etapas_pedido")
        .select("id, etapa_anterior, etapa_nova, observacao, created_at, autor_id, pedidos!inner(user_id)")
        .eq("pedido_id", pedidoId!)
        .eq("pedidos.user_id", user.id)
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
      // Tabela removida conforme solicitação. Retorna array vazio.
      return [];
    },
  });
}

export function usePedido(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pedido", id, user?.id],
    enabled: !!id && !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, clientes(nome, telefone, cidade, email, endereco, numero, bairro, cep, complemento, cpf, instagram, origem)")
        .eq("id", id!)
        .eq("user_id", user.id)
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
  prioridade: "baixa" | "media" | "alta" | "urgente";
  etapa: StatusEtapa;
  // financeiro
  valor_total: number;
  valor_pago: number;
  cpf?: string;
  cep?: string;
  endereco?: string;
  numero_endereco?: string;
  complemento?: string;
  bairro?: string;
  instagram?: string;
  origem?: string;
  anexos?: string[];
}

export function useCreatePedido() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: NovoPedidoInput) => {
      if (!user) throw new Error("Usuário não autenticado");
      let clienteId = input.cliente_id;
      if (!clienteId) {
        const { data: cli, error: e1 } = await supabase
          .from("clientes")
          .insert({
            nome: input.cliente_nome || "Cliente sem nome",
            telefone: input.telefone || null,
            email: input.email || null,
            cidade: input.cidade || null,
            cpf: input.cpf || null,
            cep: input.cep || null,
            endereco: input.endereco || null,
            numero: input.numero_endereco || null,
            complemento: input.complemento || null,
            bairro: input.bairro || null,
            instagram: input.instagram || null,
            origem: input.origem || null,
            user_id: user.id,
          })
          .select("id")
          .single();
        if (e1) throw e1;
        clienteId = cli.id;
      } else {
        const { error: e1 } = await supabase
          .from("clientes")
          .update({
            nome: input.cliente_nome || "Cliente sem nome",
            telefone: input.telefone || null,
            email: input.email || null,
            cidade: input.cidade || null,
            cpf: input.cpf || null,
            cep: input.cep || null,
            endereco: input.endereco || null,
            numero: input.numero_endereco || null,
            complemento: input.complemento || null,
            bairro: input.bairro || null,
            instagram: input.instagram || null,
            origem: input.origem || null,
          })
          .eq("id", clienteId)
          .eq("user_id", user.id);
        if (e1) throw e1;
      }

      const payload = {
        cliente_id: clienteId,
        produto: input.produto || "Produto não informado",
        tipo: input.tipo || null,
        material: input.material || null,
        cor: input.cor || null,
        observacoes: input.observacoes || null,
        entrega: input.entrega || null,
        etapa: input.etapa || "pedido-recebido",
        prioridade: input.prioridade || "media",
        valor_total: Number(input.valor_total) || 0,
        valor_pago: Number(input.valor_pago) || 0,
        numero: String(Math.floor(100000 + Math.random() * 900000)),
        user_id: user.id,
        anexos: input.anexos || [],
      };

      const { data: pedido, error: e2 } = await supabase
        .from("pedidos")
        .insert(payload)
        .select("id")
        .single();
      if (e2) throw e2;

      return pedido.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}

export function useUpdatePedido() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...input }: NovoPedidoInput & { id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      // Update client data alongside order if cliente_id present
      if (input.cliente_id) {
        const { error: ec } = await supabase
          .from("clientes")
          .update({
            nome: input.cliente_nome || "Cliente sem nome",
            telefone: input.telefone || null,
            email: input.email || null,
            cidade: input.cidade || null,
            cpf: input.cpf || null,
            cep: input.cep || null,
            endereco: input.endereco || null,
            numero: input.numero_endereco || null,
            complemento: input.complemento || null,
            bairro: input.bairro || null,
            instagram: input.instagram || null,
            origem: input.origem || null,
          })
          .eq("id", input.cliente_id)
          .eq("user_id", user.id);
        if (ec) throw ec;
      }
      const { error } = await supabase
        .from("pedidos")
        .update({
          produto: input.produto || "Produto não informado",
          tipo: input.tipo || null,
          material: input.material || null,
          cor: input.cor || null,
          observacoes: input.observacoes || null,
          entrega: input.entrega || null,
          etapa: input.etapa,
          prioridade: input.prioridade,
          valor_total: Number(input.valor_total) || 0,
          valor_pago: Number(input.valor_pago) || 0,
          anexos: input.anexos,
        })
        .eq("id", id)
        .eq("user_id", user.id);
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data: p, error } = await supabase
        .from("pedidos")
        .select("cliente_id, produto, tipo, material, cor, observacoes, entrega, etapa, prioridade, valor_total, anexos")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      const { data: novo, error: e2 } = await supabase
        .from("pedidos")
        .insert({
          cliente_id: p.cliente_id,
          produto: p.produto || "Produto não informado",
          tipo: p.tipo,
          material: p.material,
          cor: p.cor,
          observacoes: p.observacoes,
          entrega: p.entrega,
          etapa: "pedido-recebido",
          prioridade: p.prioridade || "media",
          valor_total: Number(p.valor_total) || 0,
          valor_pago: 0,
          numero: String(Math.floor(100000 + Math.random() * 900000)),
          user_id: user.id,
          anexos: p.anexos || [],
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, entrega }: { id: string; entrega: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase.from("pedidos").update({ entrega }).eq("id", id).eq("user_id", user.id);
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ pedido_id, valor }: { pedido_id: string; valor: number; forma?: string; pago_em?: string; observacao?: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      // increment valor_pago atomically via re-read
      const { data: p, error: pErr } = await supabase.from("pedidos").select("valor_pago").eq("id", pedido_id).eq("user_id", user.id).single();
      if (pErr) {
        console.error('Erro Supabase ao ler pedido:', pErr);
        throw pErr;
      }
      
      const novoValorPago = Number(p.valor_pago || 0) + Number(valor);
      
      const { error: updateErr } = await supabase.from("pedidos").update({ valor_pago: novoValorPago }).eq("id", pedido_id).eq("user_id", user.id);
      if (updateErr) {
        console.error('Erro Supabase ao atualizar pedido:', updateErr);
        throw updateErr;
      }
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data: checkData, error: checkError } = await supabase
        .from("pedidos")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (checkError) throw checkError;
      if (!checkData) throw new Error("Pedido não encontrado ou sem permissão");

      await supabase.from("etapas_pedido").delete().eq("pedido_id", id);
      const { error } = await supabase.from("pedidos").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}
