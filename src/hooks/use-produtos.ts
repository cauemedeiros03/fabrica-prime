import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number | null;
  tipo_movel: string | null;
  material: string | null;
  cor_acabamento: string | null;
  criado_em: string;
  imagem_url: string | null;
}

export interface ProdutoInput {
  nome: string;
  descricao?: string;
  preco?: number;
  tipo_movel?: string;
  material?: string;
  cor_acabamento?: string;
  imagem_url?: string;
}

export function useProdutos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["produtos", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("catalogo_produtos")
        .select("id, nome, descricao, preco, tipo_movel, material, cor_acabamento, criado_em, imagem_url")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        preco: p.preco ? Number(p.preco) : null,
      })) as Produto[];
    },
  });
}

export function useCreateProduto() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: ProdutoInput) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("catalogo_produtos")
        .insert({
          nome: input.nome,
          descricao: input.descricao || null,
          preco: input.preco ?? null,
          tipo_movel: input.tipo_movel || null,
          material: input.material || null,
          cor_acabamento: input.cor_acabamento || null,
          imagem_url: input.imagem_url || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["produtos"] }),
  });
}

export function useUpdateProduto() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...input }: ProdutoInput & { id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("catalogo_produtos")
        .update({
          nome: input.nome,
          descricao: input.descricao || null,
          preco: input.preco ?? null,
          tipo_movel: input.tipo_movel || null,
          material: input.material || null,
          cor_acabamento: input.cor_acabamento || null,
          imagem_url: input.imagem_url || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}

export function useDeleteProduto() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("catalogo_produtos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["produtos"] }),
  });
}
