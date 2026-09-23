import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NovoPedidoInput {
  id?: string;
  cliente_id?: string | null;
  cliente_nome: string;
  telefone?: string | null;
  email?: string | null;
  cidade?: string | null;
  produto: string;
  tipo?: string | null;
  material?: string | null;
  cor?: string | null;
  observacoes?: string | null;
  entrega?: string | null;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  etapa: string;
  valor_total: number;
  valor_pago: number;
  desconto?: number;
  forma_pagamento?: string | null;
  cpf?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero_endereco?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  instagram?: string | null;
  origem?: string | null;
  anexos?: string[];
  data_criacao?: string | null;
  data_entrega_estimada?: string | null;
}

export interface Pedido extends NovoPedidoInput {
  id: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

/** Flag auxiliar para controlo de estado de arrasto no Kanban / Realtime */
export const isDraggingMutation = { current: false };

/** Hook para listar todos os pedidos */
export function usePedidos() {
  return useQuery({
    queryKey: ["pedidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao procurar pedidos:", error);
        throw error;
      }
      return (data || []) as Pedido[];
    },
  });
}

/** Hook para procurar um pedido específico por ID */
export function usePedido(id?: string) {
  return useQuery({
    queryKey: ["pedidos", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Erro ao procurar detalhe do pedido:", error);
        throw error;
      }
      return data as Pedido;
    },
  });
}

/** Hook para criar um novo pedido */
export function useCreatePedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NovoPedidoInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const payload = {
        cliente_id: input.cliente_id || null,
        cliente_nome: input.cliente_nome,
        telefone: input.telefone || null,
        email: input.email || null,
        cidade: input.cidade || null,
        produto: input.produto,
        tipo: input.tipo || null,
        material: input.material || null,
        cor: input.cor || null,
        observacoes: input.observacoes || null,
        entrega: input.entrega || null,
        prioridade: input.prioridade || "media",
        etapa: input.etapa || "pedido-recebido",
        valor_total: input.valor_total || 0,
        valor_pago: input.valor_pago || 0,
        desconto: input.desconto || 0,
        cpf: input.cpf || null,
        cep: input.cep || null,
        endereco: input.endereco || null,
        numero_endereco: input.numero_endereco || null,
        complemento: input.complemento || null,
        bairro: input.bairro || null,
        instagram: input.instagram || null,
        origem: input.origem || null,
        anexos: input.anexos || [],
        data_criacao: input.data_criacao || new Date().toISOString().split("T")[0],
        data_entrega_estimada: input.data_entrega_estimada || input.entrega || null,
        ...(userId ? { user_id: userId } : {}),
      };

      const { data, error } = await supabase
        .from("pedidos")
        .insert(payload as any)
        .select()
        .single();

      if (error) {
        console.error("Erro ao inserir pedido:", error);
        throw new Error(error.message || "Erro ao criar o pedido no banco de dados.");
      }

      if (input.valor_pago > 0 && data?.id) {
        await supabase.from("pagamentos").insert({
          pedido_id: data.id,
          valor: input.valor_pago,
          forma: input.forma_pagamento || "Pix",
          observacao: "Pagamento inicial / entrada",
          ...(userId ? { user_id: userId } : {}),
        } as any);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
    },
  });
}

/** Hook para atualizar um pedido existente */
export function useUpdatePedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<NovoPedidoInput> & { id: string }) => {
      const { id, ...fields } = input;

      const { data, error } = await supabase
        .from("pedidos")
        .update(fields as any)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar pedido:", error);
        throw new Error(error.message || "Erro ao atualizar o pedido no banco de dados.");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
    },
  });
}

/** Hook para mover a etapa do pedido no quadro Kanban */
export function useMoverEtapaPedido() {
  const update = useUpdatePedido();

  return useMutation({
    mutationFn: async ({ id, etapa }: { id: string; etapa: string }) => {
      isDraggingMutation.current = true;
      try {
        return await update.mutateAsync({ id, etapa });
      } finally {
        setTimeout(() => {
          isDraggingMutation.current = false;
        }, 500);
      }
    },
  });
}

/** Aliases para retrocompatibilidade com outros componentes */
export const useAtualizarEtapa = useMoverEtapaPedido;
export const useUpdateEtapaPedido = useMoverEtapaPedido;

/** Hook para eliminar um pedido */
export function useDeletePedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Erro ao eliminar pedido:", error);
        throw new Error(error.message || "Erro ao eliminar o pedido.");
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
    },
  });
}

/** Hook para converter um orçamento salvo num pedido ativo */
export function useConverterOrcamentoEmPedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orcamento: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const valorTotalSugerido = Number(orcamento.valorSugerido || orcamento.valor_sugerido || 0);
      const descontoVal = Number(orcamento.desconto || 0);
      const valorFinal = Math.max(0, valorTotalSugerido - descontoVal);

      const payload = {
        cliente_id: orcamento.clienteId || orcamento.cliente_id || null,
        cliente_nome: orcamento.clienteNome || orcamento.cliente_nome || orcamento.prospecto_nome || "Cliente sem nome",
        telefone: orcamento.clienteTelefone || orcamento.cliente_telefone || orcamento.prospecto_telefone || null,
        cidade: orcamento.clienteCidade || orcamento.cliente_cidade || orcamento.prospecto_cidade || null,
        email: orcamento.clienteEmail || orcamento.cliente_email || null,
        cpf: orcamento.clienteCpfCnpj || orcamento.cliente_cpf_cnpj || null,
        endereco: orcamento.clienteEndereco || orcamento.cliente_endereco || null,
        produto: orcamento.produtoDescricao || orcamento.produto_descricao || "Produto de Orçamento",
        material: orcamento.produtoMaterial || orcamento.produto_material || null,
        observacoes: orcamento.observacoes || null,
        valor_total: valorFinal,
        valor_pago: 0,
        desconto: descontoVal,
        prioridade: "media",
        etapa: "pedido-recebido",
        data_criacao: new Date().toISOString().split("T")[0],
        ...(userId ? { user_id: userId } : {}),
      };

      const { data: novoPedido, error: createError } = await supabase
        .from("pedidos")
        .insert(payload as any)
        .select()
        .single();

      if (createError) {
        console.error("Erro ao converter orçamento em pedido:", createError);
        throw new Error(createError.message || "Falha ao criar o pedido a partir do orçamento.");
      }

      if (orcamento.id) {
        await (supabase as any)
          .from("orcamentos_salvos")
          .update({ status: "Aprovado" })
          .eq("id", orcamento.id);
      }

      return novoPedido;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      toast.success("Orçamento convertido em pedido com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao converter orçamento", {
        description: err?.message || "Não foi possível concluir a conversão.",
      });
    },
  });
}