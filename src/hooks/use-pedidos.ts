import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

  // Mantemos string para não quebrar os componentes existentes.
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

/**
 * Flag auxiliar para controle do Kanban / Realtime.
 */
export const isDraggingMutation = {
  current: false,
};

/* ==========================================================================
   PEDIDOS
   ========================================================================== */

/**
 * Lista todos os pedidos.
 */
export function usePedidos() {
  return useQuery({
    queryKey: ["pedidos"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("Erro ao buscar pedidos:", error);

        throw new Error(
          error.message || "Não foi possível carregar os pedidos."
        );
      }

      return (data ?? []) as Pedido[];
    },
  });
}

/**
 * Busca um pedido específico.
 */
export function usePedido(id?: string) {
  return useQuery({
    queryKey: ["pedidos", id],
    enabled: Boolean(id),

    queryFn: async () => {
      if (!id) {
        return null;
      }

      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error(
          "Erro ao buscar detalhe do pedido:",
          error
        );

        throw new Error(
          error.message ||
          "Não foi possível carregar o pedido."
        );
      }

      return data as Pedido | null;
    },
  });
}

/* ==========================================================================
   CRIAR PEDIDO
   ========================================================================== */

export function useCreatePedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NovoPedidoInput) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error(
          "Erro ao obter usuário:",
          authError
        );

        throw new Error(
          "Não foi possível verificar o usuário autenticado."
        );
      }

      const userId = user?.id;

      const valorTotal = Number(input.valor_total) || 0;
      const valorPago = Number(input.valor_pago) || 0;
      const desconto = Number(input.desconto) || 0;

      /*
       * Usamos um payload separado para evitar que a tipagem
       * automática do Supabase bloqueie campos existentes no
       * banco mas que não estão refletidos corretamente nos
       * tipos gerados.
       */
      const payload = {
        cliente_id: input.cliente_id ?? null,
        cliente_nome:
          input.cliente_nome?.trim() ||
          "Cliente sem nome",

        telefone: input.telefone ?? null,
        email: input.email ?? null,
        cidade: input.cidade ?? null,

        produto:
          input.produto?.trim() ||
          "Produto não informado",

        tipo: input.tipo ?? null,
        material: input.material ?? null,
        cor: input.cor ?? null,

        observacoes: input.observacoes ?? null,
        entrega: input.entrega ?? null,

        prioridade: input.prioridade || "media",
        etapa: input.etapa || "pedido-recebido",

        valor_total: valorTotal,
        valor_pago: valorPago,
        desconto,

        forma_pagamento:
          input.forma_pagamento ?? null,

        cpf: input.cpf ?? null,
        cep: input.cep ?? null,
        endereco: input.endereco ?? null,

        // Campo obrigatório indicado pelo TypeScript do banco
        numero_endereco:
          input.numero_endereco ?? null,

        complemento:
          input.complemento ?? null,

        bairro: input.bairro ?? null,

        instagram:
          input.instagram ?? null,

        origem:
          input.origem ?? null,

        anexos:
          input.anexos ?? [],

        data_criacao:
          input.data_criacao ??
          new Date().toISOString().split("T")[0],

        data_entrega_estimada:
          input.data_entrega_estimada ??
          input.entrega ??
          null,

        ...(userId
          ? {
            user_id: userId,
          }
          : {}),
      };

      /*
       * O `as any` aqui é intencional.
       *
       * O banco possui campos/enums que não estão corretamente
       * refletidos na tipagem atual gerada pelo Supabase.
       */
      const { data, error } = await supabase
        .from("pedidos")
        .insert(payload as any)
        .select()
        .single();

      if (error) {
        console.error(
          "Erro ao inserir pedido:",
          error
        );

        throw new Error(
          error.message ||
          "Erro ao criar o pedido no banco de dados."
        );
      }

      /* ------------------------------------------------------------------
         PAGAMENTO INICIAL
         ------------------------------------------------------------------ */

      if (valorPago > 0 && data?.id) {
        const pagamentoPayload = {
          pedido_id: data.id,
          valor: valorPago,
          forma:
            input.forma_pagamento || "Pix",
          observacao:
            "Pagamento inicial / entrada",

          ...(userId
            ? {
              user_id: userId,
            }
            : {}),
        };

        /*
         * O tipo gerado pelo Supabase está marcando user_id
         * como `never`, então usamos o mesmo tratamento aqui.
         */
        const {
          error: pagamentoError,
        } = await supabase
          .from("pagamentos")
          .insert(pagamentoPayload as any);

        if (pagamentoError) {
          console.error(
            "Erro ao registrar pagamento inicial:",
            pagamentoError
          );

          throw new Error(
            `Pedido criado, mas houve um erro ao registrar o pagamento: ${pagamentoError.message}`
          );
        }
      }

      return data as Pedido;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pedidos"],
      });

      queryClient.invalidateQueries({
        queryKey: ["financeiro"],
      });

      toast.success(
        "Pedido criado com sucesso!"
      );
    },

    onError: (error: Error) => {
      toast.error(
        "Erro ao criar pedido",
        {
          description: error.message,
        }
      );
    },
  });
}

/* ==========================================================================
   ATUALIZAR PEDIDO
   ========================================================================== */

export function useUpdatePedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Partial<NovoPedidoInput> & {
        id: string;
      }
    ) => {
      const { id, ...fields } = input;

      if (!id) {
        throw new Error(
          "ID do pedido não informado."
        );
      }

      /*
       * Remove apenas undefined.
       * null continua permitindo limpar um campo.
       */
      const cleanFields = Object.fromEntries(
        Object.entries(fields).filter(
          ([, value]) =>
            value !== undefined
        )
      );

      if (
        Object.keys(cleanFields).length === 0
      ) {
        throw new Error(
          "Nenhum campo foi informado para atualização."
        );
      }

      const { data, error } = await supabase
        .from("pedidos")
        .update(cleanFields as any)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(
          "Erro ao atualizar pedido:",
          error
        );

        throw new Error(
          error.message ||
          "Erro ao atualizar o pedido."
        );
      }

      return data as Pedido;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pedidos"],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "pedidos",
          variables.id,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: ["financeiro"],
      });
    },

    onError: (error: Error) => {
      toast.error(
        "Erro ao atualizar pedido",
        {
          description: error.message,
        }
      );
    },
  });
}

/* ==========================================================================
   KANBAN
   ========================================================================== */

export function useMoverEtapaPedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      etapa,
    }: {
      id: string;
      etapa: string;
    }) => {
      if (!id) {
        throw new Error(
          "ID do pedido não informado."
        );
      }

      if (!etapa) {
        throw new Error(
          "Etapa do pedido não informada."
        );
      }

      isDraggingMutation.current = true;

      try {
        const { data, error } =
          await supabase
            .from("pedidos")
            .update({
              etapa,
            } as any)
            .eq("id", id)
            .select()
            .single();

        if (error) {
          console.error(
            "Erro ao mover pedido no Kanban:",
            error
          );

          throw new Error(
            error.message ||
            "Não foi possível mover o pedido."
          );
        }

        return data as Pedido;
      } finally {
        setTimeout(() => {
          isDraggingMutation.current =
            false;
        }, 500);
      }
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pedidos"],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "pedidos",
          variables.id,
        ],
      });
    },

    onError: (error: Error) => {
      toast.error(
        "Erro ao mover pedido",
        {
          description: error.message,
        }
      );
    },
  });
}

/* ==========================================================================
   EXCLUIR PEDIDO
   ========================================================================== */

export function useDeletePedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!id) {
        throw new Error(
          "ID do pedido não informado."
        );
      }

      const { error } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", id);

      if (error) {
        console.error(
          "Erro ao eliminar pedido:",
          error
        );

        throw new Error(
          error.message ||
          "Erro ao eliminar o pedido."
        );
      }

      return id;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pedidos"],
      });

      queryClient.invalidateQueries({
        queryKey: ["financeiro"],
      });

      toast.success(
        "Pedido excluído com sucesso!"
      );
    },

    onError: (error: Error) => {
      toast.error(
        "Erro ao excluir pedido",
        {
          description: error.message,
        }
      );
    },
  });
}

/* ==========================================================================
   CONVERTER ORÇAMENTO EM PEDIDO
   ========================================================================== */

export function useConverterOrcamentoEmPedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      orcamento: any
    ) => {
      if (!orcamento) {
        throw new Error(
          "Orçamento não informado."
        );
      }

      const {
        data: { user },
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw new Error(
          "Não foi possível verificar o usuário autenticado."
        );
      }

      const userId = user?.id;

      const valorTotalSugerido =
        Number(
          orcamento.valorSugerido ??
          orcamento.valor_sugerido ??
          0
        );

      const descontoVal =
        Number(
          orcamento.desconto ?? 0
        );

      const valorFinal = Math.max(
        0,
        valorTotalSugerido -
        descontoVal
      );

      const payload = {
        cliente_id:
          orcamento.clienteId ??
          orcamento.cliente_id ??
          null,

        cliente_nome:
          orcamento.clienteNome ??
          orcamento.cliente_nome ??
          orcamento.prospecto_nome ??
          "Cliente sem nome",

        telefone:
          orcamento.clienteTelefone ??
          orcamento.cliente_telefone ??
          orcamento.prospecto_telefone ??
          null,

        cidade:
          orcamento.clienteCidade ??
          orcamento.cliente_cidade ??
          orcamento.prospecto_cidade ??
          null,

        email:
          orcamento.clienteEmail ??
          orcamento.cliente_email ??
          null,

        cpf:
          orcamento.clienteCpfCnpj ??
          orcamento.cliente_cpf_cnpj ??
          null,

        endereco:
          orcamento.clienteEndereco ??
          orcamento.cliente_endereco ??
          null,

        /*
         * O banco exige numero.
         * Tentamos todas as variações que podem existir
         * no objeto de orçamento.
         */
        numero_endereco:
          orcamento.numeroEndereco ??
          orcamento.numero_endereco ??
          orcamento.numero ??
          null,

        complemento:
          orcamento.complemento ??
          null,

        bairro:
          orcamento.bairro ??
          null,

        cep:
          orcamento.cep ??
          null,

        produto:
          orcamento.produtoDescricao ??
          orcamento.produto_descricao ??
          "Produto de Orçamento",

        material:
          orcamento.produtoMaterial ??
          orcamento.produto_material ??
          null,

        observacoes:
          orcamento.observacoes ??
          null,

        valor_total:
          valorFinal,

        valor_pago: 0,

        desconto:
          descontoVal,

        prioridade:
          "media",

        etapa:
          "pedido-recebido",

        data_criacao:
          new Date()
            .toISOString()
            .split("T")[0],

        ...(userId
          ? {
            user_id: userId,
          }
          : {}),
      };

      const {
        data: novoPedido,
        error: createError,
      } = await supabase
        .from("pedidos")
        .insert(payload as any)
        .select()
        .single();

      if (createError) {
        console.error(
          "Erro ao converter orçamento em pedido:",
          createError
        );

        throw new Error(
          createError.message ||
          "Falha ao criar o pedido a partir do orçamento."
        );
      }

      /* ------------------------------------------------------------------
         ATUALIZAR ORÇAMENTO
         ------------------------------------------------------------------ */

      if (orcamento.id) {
        /*
         * `orcamentos_salvos` não está presente na tipagem
         * gerada atualmente pelo Supabase.
         *
         * O cast para any permite acessar a tabela existente
         * sem bloquear a compilação.
         */
        const {
          error: orcamentoError,
        } = await (supabase as any)
          .from("orcamentos_salvos")
          .update({
            status: "Aprovado",
          })
          .eq(
            "id",
            orcamento.id
          );

        if (orcamentoError) {
          console.error(
            "Erro ao atualizar status do orçamento:",
            orcamentoError
          );

          toast.warning(
            "Pedido criado, mas o status do orçamento não foi atualizado."
          );
        }
      }

      return novoPedido as Pedido;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pedidos"],
      });

      queryClient.invalidateQueries({
        queryKey: ["orcamentos"],
      });

      queryClient.invalidateQueries({
        queryKey: ["financeiro"],
      });

      toast.success(
        "Orçamento convertido em pedido com sucesso!"
      );
    },

    onError: (error: Error) => {
      toast.error(
        "Erro ao converter orçamento",
        {
          description:
            error.message ||
            "Não foi possível concluir a conversão.",
        }
      );
    },
  });
}

/* ==========================================================================
   ALIASES
   ========================================================================== */

export const useCriarPedido =
  useCreatePedido;

export const useAtualizarPedido =
  useUpdatePedido;

export const useEliminarPedido =
  useDeletePedido;

export const useDeletarPedido =
  useDeletePedido;

export const useAtualizarEtapa =
  useMoverEtapaPedido;

export const useUpdateEtapaPedido =
  useMoverEtapaPedido;

export const useMoverEtapa =
  useMoverEtapaPedido;

export const useAtualizarStatusPedido =
  useMoverEtapaPedido;

export const useAtualizarStatus =
  useMoverEtapaPedido;

export const useConverterOrcamento =
  useConverterOrcamentoEmPedido;