import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  observacoes: string | null;
  user_id: string;
  cpf: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  instagram: string | null;
  origem: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClienteInput {
  nome: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  observacoes?: string;
  cpf?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  instagram?: string;
  origem?: string;
}

export function useClientes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clientes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("clientes")
        .select("id, user_id, nome, telefone, email, cidade, observacoes, cpf, cep, endereco, numero, complemento, bairro, instagram, origem, created_at, updated_at")
        .eq("user_id", user.id)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
  });
}

export function useCliente(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cliente", id, user?.id],
    enabled: !!id && !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("clientes")
        .select("id, user_id, nome, telefone, email, cidade, observacoes, cpf, cep, endereco, numero, complemento, bairro, instagram, origem, created_at, updated_at")
        .eq("id", id!)
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data as Cliente;
    },
  });
}

export function usePedidosCliente(clienteId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pedidos-cliente", clienteId, user?.id],
    enabled: !!clienteId && !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero, produto, valor_total, valor_pago, entrega, etapa, prioridade, created_at")
        .eq("cliente_id", clienteId!)
        .eq("user_id", user.id)
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



export function useCreateCliente() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: ClienteInput) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("clientes")
        .insert({
          nome: input.nome,
          telefone: input.telefone || null,
          email: input.email || null,
          cidade: input.cidade || null,
          observacoes: input.observacoes || null,
          cpf: input.cpf || null,
          cep: input.cep || null,
          endereco: input.endereco || null,
          numero: input.numero || null,
          complemento: input.complemento || null,
          bairro: input.bairro || null,
          instagram: input.instagram || null,
          origem: input.origem || null,
          user_id: user.id,
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...input }: ClienteInput & { id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("clientes")
        .update({
          nome: input.nome,
          telefone: input.telefone || null,
          email: input.email || null,
          cidade: input.cidade || null,
          observacoes: input.observacoes || null,
          cpf: input.cpf || null,
          cep: input.cep || null,
          endereco: input.endereco || null,
          numero: input.numero || null,
          complemento: input.complemento || null,
          bairro: input.bairro || null,
          instagram: input.instagram || null,
          origem: input.origem || null,
        })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["cliente", vars.id] });
      qc.invalidateQueries({ queryKey: ["pedidos"] });
    },
  });
}

export function useSalvarClienteAutomaticamente() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ClienteInput) => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const nome = input.nome?.trim();

      if (!nome) {
        throw new Error("O nome do cliente é obrigatório.");
      }

      const { data: clientesExistentes, error: buscaError } =
        await supabase
          .from("clientes")
          .select("id, nome")
          .eq("user_id", user.id)
          .ilike("nome", nome);

      if (buscaError) throw buscaError;

      const clienteExistente = clientesExistentes?.[0];

      const dadosCliente = {
        nome,
        telefone: input.telefone?.trim() || null,
        email: input.email?.trim() || null,
        cidade: input.cidade?.trim() || null,
        observacoes: input.observacoes?.trim() || null,
        cpf: input.cpf?.trim() || null,
        cep: input.cep?.trim() || null,
        endereco: input.endereco?.trim() || null,
        numero: input.numero?.trim() || null,
        complemento: input.complemento?.trim() || null,
        bairro: input.bairro?.trim() || null,
        instagram: input.instagram?.trim() || null,
        origem: input.origem?.trim() || null,
        user_id: user.id,
      };

      if (clienteExistente) {
        const { data, error } = await supabase
          .from("clientes")
          .update(dadosCliente)
          .eq("id", clienteExistente.id)
          .eq("user_id", user.id)
          .select("id")
          .single();

        if (error) throw error;

        return data.id as string;
      }

      const { data, error } = await supabase
        .from("clientes")
        .insert(dadosCliente)
        .select("id")
        .single();

      if (error) throw error;

      return data.id as string;
    },

    onSuccess: (clienteId) => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["cliente", clienteId] });
    },
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      // Bloqueia se houver pedidos vinculados
      const { count, error: cErr } = await supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", id)
        .eq("user_id", user.id);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        throw new Error(
          `Cliente possui ${count} pedido(s) vinculado(s). Remova os pedidos antes.`,
        );
      }
      const { error } = await supabase.from("clientes").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}
