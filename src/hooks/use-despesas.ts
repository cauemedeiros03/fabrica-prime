import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  created_at: string;
  user_id: string;
}

export interface DespesaInput {
  descricao: string;
  valor: number;
  data: string;
}

export function useDespesas(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["despesas", user?.id, startDate, endDate],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      let query = supabase
        .from("despesas")
        .select("*")
        .eq("user_id", user.id)
        .order("data", { ascending: false });

      if (startDate) {
        query = query.gte("data", startDate);
      }
      if (endDate) {
        query = query.lte("data", endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Despesa[];
    },
  });
}

export function useCreateDespesa() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: DespesaInput) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("despesas")
        .insert({
          descricao: input.descricao,
          valor: input.valor,
          data: input.data,
          user_id: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["despesas"] });
    },
  });
}

export function useDeleteDespesa() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("despesas")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["despesas"] });
    },
  });
}
