import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ==========================================================================
   TIPOS
   ========================================================================== */

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

export interface AddPagamentoInput {
  pedido_id?: string;
  pedidoId?: string;

  valor: number;

  forma?: string;
  forma_pagamento?: string;

  observacao?: string;
}

export interface VendaDiretaInput {
  cliente_id?: string | null;
  cliente_nome?: string | null;

  produto?: string | null;

  valor_total: number;
  valor_pago?: number;

  forma_pagamento?: string | null;

  observacoes?: string | null;

  data_venda?: string | null;
}

export interface ReagendarEntregaInput {
  id: string;

  data_entrega_estimada?: string | null;

  data_entrega?: string | null;

  entrega?: string | null;
}

/*
 * Controle auxiliar utilizado pelo Kanban.
 */
export const isDraggingMutation = {
  current: false,
};


/* ==========================================================================
   LISTAR PEDIDOS
   ========================================================================== */

export function usePedidos() {
  return useQuery({
    queryKey: ["pedidos"],

    queryFn: async () => {
      const {
        data,
        error,
      } = await supabase
        .from("pedidos")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

            if (error) {
        console.error(
          "Erro ao procurar pedidos:",
          error
        );

        throw new Error(
          error.message ||
          "Não foi possível carregar os pedidos."
        );
      }

      return (data ?? []).map((p: any) => ({
        ...p,

        cliente: p.cliente_nome ?? "",
        valorTotal: Number(p.valor_total ?? 0),
        valorPago: Number(p.valor_pago ?? 0),

        criadoEm:
          p.data_criacao ??
          p.created_at ??
          new Date().toISOString(),

        atualizadoEm:
          p.updated_at ??
          p.created_at ??
          null,

        entrega:
          p.data_entrega_estimada ??
          p.entrega ??
          null,

        telefone: (p as any).telefone ?? "",
        email: (p as any).email ?? "",
        cidade: (p as any).cidade ?? "",
        produto: p.produto ?? "",
        tipo: p.tipo ?? "",
        material: p.material ?? "",
        cor: p.cor ?? "",

        desconto: Number(p.desconto ?? 0),

        anexos: Array.isArray(p.anexos)
          ? p.anexos
          : [],

        prioridade:
          p.prioridade ?? "media",

        etapa:
          p.etapa ?? "pedido-recebido",
      })) as Pedido[];
    },
  });
}


/* ==========================================================================
   BUSCAR PEDIDO
   ========================================================================== */

export function usePedido(id?: string) {
  return useQuery({
    queryKey: ["pedidos", id],

    enabled: Boolean(id),

    queryFn: async () => {
      if (!id) {
        return null;
      }

      const {
        data,
        error,
      } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error(
          "Erro ao procurar detalhe do pedido:",
          error
        );

        throw new Error(
          error.message ||
          "Não foi possível carregar o pedido."
        );
      }

      return {
  ...data,

  cliente: data.cliente_nome ?? "",
  valorTotal: Number(data.valor_total ?? 0),
  valorPago: Number(data.valor_pago ?? 0),

  criadoEm:
    data.data_criacao ??
    data.created_at ??
    new Date().toISOString(),

  atualizadoEm:
    data.updated_at ??
    data.created_at ??
    null,

  entrega:
    data.data_entrega_estimada ??
    data.entrega ??
    null,

  telefone: (data as any).telefone ?? "",
  email: (data as any).email ?? "",
  cidade: (data as any).cidade ?? "",
  produto: data.produto ?? "",
  tipo: data.tipo ?? "",
  material: data.material ?? "",
  cor: data.cor ?? "",

  desconto: Number(data.desconto ?? 0),

  anexos: Array.isArray(data.anexos)
    ? data.anexos
    : [],

  prioridade:
    data.prioridade ?? "media",

  etapa:
    data.etapa ?? "pedido-recebido",
} as Pedido;
    },
  });
}


/* ==========================================================================
   CRIAR PEDIDO
   ========================================================================== */

export function useCreatePedido() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      input: NovoPedidoInput
    ) => {
      const {
        data: userData,
      } =
        await supabase.auth.getUser();

      const userId =
        userData?.user?.id;

      const valorTotal =
        Number(input.valor_total) || 0;

      const valorPago =
        Number(input.valor_pago) || 0;

      const desconto =
        Number(input.desconto) || 0;

      const numeroPedido = `PED-${Date.now()}`;

const payload = {
  numero: numeroPedido,

  cliente_id:
    input.cliente_id ?? null,

        cliente_nome:
          input.cliente_nome?.trim() ||
          "Cliente sem nome",

        telefone:
          input.telefone ?? null,

        email:
          input.email ?? null,

        cidade:
          input.cidade ?? null,

        produto:
          input.produto?.trim() ||
          "Produto não informado",

        tipo:
          input.tipo ?? null,

        material:
          input.material ?? null,

        cor:
          input.cor ?? null,

        observacoes:
          input.observacoes ?? null,

        entrega:
          input.entrega ?? null,

        prioridade:
          input.prioridade ||
          "media",

        etapa:
          input.etapa ||
          "pedido-recebido",

        valor_total:
          valorTotal,

        valor_pago:
          valorPago,

        desconto,

        forma_pagamento:
          input.forma_pagamento ??
          null,

        cpf:
          input.cpf ?? null,

        cep:
          input.cep ?? null,

        endereco:
          input.endereco ?? null,

        numero_endereco:
          input.numero_endereco ??
          null,

        complemento:
          input.complemento ??
          null,

        bairro:
          input.bairro ?? null,

        instagram:
          input.instagram ?? null,

        origem:
          input.origem ?? null,

        anexos:
          input.anexos ?? [],

        data_criacao:
          input.data_criacao ??
          new Date()
            .toISOString()
            .split("T")[0],

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

      const {
        data,
        error,
      } = await supabase
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

      /*
       * Registra pagamento inicial.
       */
      if (
        valorPago > 0 &&
        data?.id
      ) {
        const pagamentoPayload = {
          pedido_id:
            data.id,

          valor:
            valorPago,

          forma:
            input.forma_pagamento ||
            "Pix",

          observacao:
            "Pagamento inicial / entrada",

        };

        const {
          error:
          pagamentoError,
        } = await supabase
          .from("pagamentos")
          .insert(
            pagamentoPayload as any
          );

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

      queryClient.invalidateQueries({
        queryKey: ["pagamentos"],
      });

      toast.success(
        "Pedido criado com sucesso!"
      );
    },

    onError: (
      error: Error
    ) => {
      toast.error(
        "Erro ao criar pedido",
        {
          description:
            error.message,
        }
      );
    },
  });
}


/* ==========================================================================
   ATUALIZAR PEDIDO
   ========================================================================== */

export function useUpdatePedido() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Partial<NovoPedidoInput> & {
        id: string;
      }
    ) => {
      const {
        id,
        ...fields
      } = input;

      if (!id) {
        throw new Error(
          "ID do pedido não informado."
        );
      }

      const cleanFields =
        Object.fromEntries(
          Object.entries(fields).filter(
            ([, value]) =>
              value !== undefined
          )
        );

      if (
        Object.keys(cleanFields)
          .length === 0
      ) {
        throw new Error(
          "Nenhum campo foi informado para atualização."
        );
      }

      const {
        data,
        error,
      } = await supabase
        .from("pedidos")
        .update(
          cleanFields as any
        )
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

    onSuccess: (
      _data,
      variables
    ) => {
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

      queryClient.invalidateQueries({
        queryKey: ["pagamentos"],
      });
    },

    onError: (
      error: Error
    ) => {
      toast.error(
        "Erro ao atualizar pedido",
        {
          description:
            error.message,
        }
      );
    },
  });
}


/* ==========================================================================
   ATUALIZAR ETAPA / KANBAN
   ========================================================================== */

export function useMoverEtapaPedido() {
  const queryClient =
    useQueryClient();

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

      isDraggingMutation.current =
        true;

      try {
        const {
          data,
          error,
        } = await supabase
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

    onSuccess: (
      _data,
      variables
    ) => {
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

    onError: (
      error: Error
    ) => {
      toast.error(
        "Erro ao mover pedido",
        {
          description:
            error.message,
        }
      );
    },
  });
}


/* ==========================================================================
   REAGENDAR ENTREGA
   ========================================================================== */

export function useReagendarEntrega() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      input: ReagendarEntregaInput
    ) => {
      if (!input?.id) {
        throw new Error(
          "ID do pedido não informado."
        );
      }

      /*
       * Aceitamos os três nomes para manter compatibilidade
       * com diferentes componentes da aplicação.
       */
      const novaData =
        input.data_entrega_estimada ??
        input.data_entrega ??
        input.entrega;

      if (!novaData) {
        throw new Error(
          "Nova data de entrega não informada."
        );
      }

      const {
        data,
        error,
      } = await supabase
        .from("pedidos")
        .update({
          data_entrega_estimada:
            novaData,

          entrega:
            novaData,
        } as any)
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        console.error(
          "Erro ao reagendar entrega:",
          error
        );

        throw new Error(
          error.message ||
          "Não foi possível reagendar a entrega."
        );
      }

      return data as Pedido;
    },

    onSuccess: (
      _data,
      variables
    ) => {
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
        queryKey: ["agenda"],
      });

      toast.success(
        "Entrega reagendada com sucesso!"
      );
    },

    onError: (
      error: Error
    ) => {
      toast.error(
        "Erro ao reagendar entrega",
        {
          description:
            error.message,
        }
      );
    },
  });
}


/* ==========================================================================
   EXCLUIR PEDIDO
   ========================================================================== */

export function useDeletePedido() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string
    ) => {
      if (!id) {
        throw new Error(
          "ID do pedido não informado."
        );
      }

      const {
        error,
      } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", id);

      if (error) {
        console.error(
          "Erro ao excluir pedido:",
          error
        );

        throw new Error(
          error.message ||
          "Erro ao excluir o pedido."
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

      queryClient.invalidateQueries({
        queryKey: ["agenda"],
      });

      toast.success(
        "Pedido excluído com sucesso!"
      );
    },

    onError: (
      error: Error
    ) => {
      toast.error(
        "Erro ao excluir pedido",
        {
          description:
            error.message,
        }
      );
    },
  });
}


/* ==========================================================================
   DUPLICAR PEDIDO
   ========================================================================== */

export function useDuplicatePedido() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      pedido: Pedido | string
    ) => {
      let pedidoOriginal:
        Pedido;

      if (
        typeof pedido === "string"
      ) {
        const {
          data,
          error,
        } = await supabase
          .from("pedidos")
          .select("*")
          .eq("id", pedido)
          .single();

        if (error) {
          throw new Error(
            error.message ||
            "Não foi possível encontrar o pedido."
          );
        }

        pedidoOriginal =
          data as Pedido;
      } else {
        pedidoOriginal =
          pedido;
      }

      const {
        id: _id,
        created_at: _createdAt,
        updated_at: _updatedAt,
        ...dados
      } = pedidoOriginal;

      const payload = {
        ...dados,

        cliente_nome:
          dados.cliente_nome ||
          "Cliente sem nome",

        etapa:
          "pedido-recebido",

        valor_pago:
          0,

        data_criacao:
          new Date()
            .toISOString()
            .split("T")[0],
      };

      const {
        data,
        error,
      } = await supabase
        .from("pedidos")
        .insert(
          payload as any
        )
        .select()
        .single();

      if (error) {
        console.error(
          "Erro ao duplicar pedido:",
          error
        );

        throw new Error(
          error.message ||
          "Não foi possível duplicar o pedido."
        );
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
        "Pedido duplicado com sucesso!"
      );
    },

    onError: (
      error: Error
    ) => {
      toast.error(
        "Erro ao duplicar pedido",
        {
          description:
            error.message,
        }
      );
    },
  });
}


/* ==========================================================================
   ADICIONAR PAGAMENTO
   ========================================================================== */

export function useAddPagamento() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      input: AddPagamentoInput
    ) => {
      const pedidoId =
        input.pedido_id ??
        input.pedidoId;

      if (!pedidoId) {
        throw new Error(
          "ID do pedido não informado."
        );
      }

      const valor =
        Number(input.valor);

      if (
        !Number.isFinite(valor) ||
        valor <= 0
      ) {
        throw new Error(
          "Informe um valor de pagamento válido."
        );
      }

      const {
        data: userData,
      } =
        await supabase.auth.getUser();

      const userId =
        userData?.user?.id;

      const pagamentoPayload = {
        pedido_id:
          pedidoId,

        valor,

        forma:
          input.forma ??
          input.forma_pagamento ??
          "Pix",

        observacao:
          input.observacao ??
          null,

        ...(userId
          ? {
            user_id: userId,
          }
          : {}),
      };

      const {
        data: pagamento,
        error: pagamentoError,
      } = await supabase
        .from("pagamentos")
        .insert(
          pagamentoPayload as any
        )
        .select()
        .single();

      if (pagamentoError) {
        console.error(
          "Erro ao adicionar pagamento:",
          pagamentoError
        );

        throw new Error(
          pagamentoError.message ||
          "Não foi possível registrar o pagamento."
        );
      }

      const {
        data: pedido,
        error: pedidoError,
      } = await supabase
        .from("pedidos")
        .select("valor_pago")
        .eq("id", pedidoId)
        .single();

      if (!pedidoError) {
        const valorPagoAtual =
          Number(
            pedido?.valor_pago
          ) || 0;

        const novoValorPago =
          valorPagoAtual +
          valor;

        await supabase
          .from("pedidos")
          .update({
            valor_pago:
              novoValorPago,
          } as any)
          .eq(
            "id",
            pedidoId
          );
      }

      return pagamento;
    },

    onSuccess: (
      _data,
      variables
    ) => {
      const pedidoId =
        variables.pedido_id ??
        variables.pedidoId;

      queryClient.invalidateQueries({
        queryKey: ["pedidos"],
      });

      queryClient.invalidateQueries({
        queryKey: ["pagamentos"],
      });

      if (pedidoId) {
        queryClient.invalidateQueries({
          queryKey: [
            "pedidos",
            pedidoId,
          ],
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["financeiro"],
      });

      toast.success(
        "Pagamento registrado com sucesso!"
      );
    },

    onError: (
      error: Error
    ) => {
      toast.error(
        "Erro ao registrar pagamento",
        {
          description:
            error.message,
        }
      );
    },
  });
}


/* ==========================================================================
   PAGAMENTOS DO PEDIDO
   ========================================================================== */

export function usePagamentosPedido(
  pedidoId?: string
) {
  return useQuery({
    queryKey: [
      "pagamentos",
      pedidoId,
    ],

    enabled:
      Boolean(pedidoId),

    queryFn: async () => {
      if (!pedidoId) {
        return [];
      }

      const {
        data,
        error,
      } = await supabase
        .from("pagamentos")
        .select("*")
        .eq(
          "pedido_id",
          pedidoId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          "Erro ao buscar pagamentos do pedido:",
          error
        );

        throw new Error(
          error.message ||
          "Não foi possível carregar os pagamentos."
        );
      }

      return data ?? [];
    },
  });
}


/* ==========================================================================
   TODOS OS PAGAMENTOS
   ========================================================================== */

export function useAllPagamentos() {
  return useQuery({
    queryKey: [
      "pagamentos",
      "todos",
    ],

    queryFn: async () => {
      const {
        data,
        error,
      } = await supabase
        .from("pagamentos")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          "Erro ao buscar todos os pagamentos:",
          error
        );

        throw new Error(
          error.message ||
          "Não foi possível carregar os pagamentos."
        );
      }

      return data ?? [];
    },
  });
}


/* ==========================================================================
   CRIAR VENDA DIRETA
   ========================================================================== */

export function useCreateVendaDireta() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      input: VendaDiretaInput
    ) => {
      const {
        data: userData,
      } =
        await supabase.auth.getUser();

      const userId =
        userData?.user?.id;

      const valorTotal =
        Number(input.valor_total) || 0;

      const valorPago =
        Number(input.valor_pago) || 0;

      if (valorTotal <= 0) {
        throw new Error(
          "Informe um valor válido para a venda."
        );
      }

      const payload = {
        cliente_id:
          input.cliente_id ??
          null,

        cliente_nome:
          input.cliente_nome?.trim() ||
          "Venda direta",

        produto:
          input.produto?.trim() ||
          "Venda direta",

        valor_total:
          valorTotal,

        valor_pago:
          valorPago,

        desconto:
          0,

        prioridade:
          "media",

        etapa:
          "concluido",

        forma_pagamento:
          input.forma_pagamento ??
          null,

        observacoes:
          input.observacoes ??
          null,

        data_criacao:
          input.data_venda ??
          new Date()
            .toISOString()
            .split("T")[0],

        data_entrega_estimada:
          null,

        ...(userId
          ? {
            user_id: userId,
          }
          : {}),
      };

      const {
        data: pedido,
        error: pedidoError,
      } = await supabase
        .from("pedidos")
        .insert(
          payload as any
        )
        .select()
        .single();

      if (pedidoError) {
        console.error(
          "Erro ao criar venda direta:",
          pedidoError
        );

        throw new Error(
          pedidoError.message ||
          "Não foi possível registrar a venda direta."
        );
      }

      if (
        valorPago > 0 &&
        pedido?.id
      ) {
        const pagamentoPayload = {
          pedido_id:
            pedido.id,

          valor:
            valorPago,

          forma:
            input.forma_pagamento ??
            "Pix",

          observacao:
            "Venda direta",

          ...(userId
            ? {
              user_id: userId,
            }
            : {}),
        };

        const {
          error:
          pagamentoError,
        } = await supabase
          .from("pagamentos")
          .insert(
            pagamentoPayload as any
          );

        if (pagamentoError) {
          console.error(
            "Erro ao registrar pagamento da venda direta:",
            pagamentoError
          );

          throw new Error(
            `Venda criada, mas houve erro ao registrar o pagamento: ${pagamentoError.message}`
          );
        }
      }

      return pedido as Pedido;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pedidos"],
      });

      queryClient.invalidateQueries({
        queryKey: ["pagamentos"],
      });

      queryClient.invalidateQueries({
        queryKey: ["financeiro"],
      });

      toast.success(
        "Venda direta registrada com sucesso!"
      );
    },

    onError: (
      error: Error
    ) => {
      toast.error(
        "Erro ao registrar venda",
        {
          description:
            error.message,
        }
      );
    },
  });
}


/* ==========================================================================
   HISTÓRICO DE ETAPAS
   ========================================================================== */

export function useEtapasHistorico(
  pedidoId?: string
) {
  return useQuery({
    queryKey: [
      "etapas-historico",
      pedidoId,
    ],

    enabled:
      Boolean(pedidoId),

    queryFn: async () => {
      if (!pedidoId) {
        return [];
      }

      const {
        data,
        error,
      } = await (
        supabase as any
      )
        .from("etapas_pedido")
        .select("*")
        .eq(
          "pedido_id",
          pedidoId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          "Erro ao buscar histórico de etapas:",
          error
        );

        throw new Error(
          error.message ||
          "Não foi possível carregar o histórico do pedido."
        );
      }

      return data ?? [];
    },
  });
}


/* ==========================================================================
   CONVERTER ORÇAMENTO EM PEDIDO
   ========================================================================== */

export function useConverterOrcamentoEmPedido() {
  const queryClient =
    useQueryClient();

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
        data: userData,
      } =
        await supabase.auth.getUser();

      const userId =
        userData?.user?.id;

      const valorTotalSugerido =
        Number(
          orcamento.valorSugerido ??
          orcamento.valor_sugerido ??
          0
        );

      const descontoVal =
        Number(
          orcamento.desconto ??
          0
        );

      const valorFinal =
        Math.max(
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

        cep:
          orcamento.cep ??
          null,

        endereco:
          orcamento.clienteEndereco ??
          orcamento.cliente_endereco ??
          null,

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

        valor_pago:
          0,

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
        .insert(
          payload as any
        )
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

      if (orcamento.id) {
        const {
          error:
          orcamentoError,
        } = await (
          supabase as any
        )
          .from("orcamentos_salvos")
          .update({
            status:
              "Aprovado",
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

    onError: (
      error: Error
    ) => {
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
   ALIASES / COMPATIBILIDADE
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

export const useUpdatePedidoEtapa =
  useMoverEtapaPedido;