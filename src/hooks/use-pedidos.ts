import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ETAPAS, type Pedido, type StatusEtapa, type Prioridade } from "@/lib/mock-data";
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
  updated_at: string;
  cliente_id: string;
  cliente_nome: string | null;
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
  historico_producao: any[] | null;
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
  historico_producao?: any[];
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
    cliente: r.cliente_nome || c?.nome || "—",
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
    atualizadoEm: r.updated_at,
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
    historico_producao: Array.isArray(r.historico_producao) ? r.historico_producao : [],
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

/**
 * Flag global que indica se há uma mutação de etapa em andamento.
 * Usada pelo useRealtimeSync para não invalidar o cache durante
 * o período de Optimistic UI, evitando race conditions.
 */
export let isDraggingMutation = false;

export function getDataReferenciaArquivamento(p: { etapa: string; atualizadoEm?: string; criadoEm: string }): number {
  // Usa updated_at se disponível, senão created_at como fallback seguro
  return p.atualizadoEm ? +new Date(p.atualizadoEm) : +new Date(p.criadoEm);
}

export function useUpdatePedidoEtapa() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, etapa, etapaAnterior }: { id: string; etapa: StatusEtapa; etapaAnterior: StatusEtapa | null; observacao?: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      // etapaAnterior é capturada no onMutate (antes do update otimístico),
      // então esta comparação usa o valor real do banco, não o cache modificado.
      if (etapaAnterior === etapa) return;

      const etapaLabel = ETAPAS.find(e => e.id === etapa)?.label || etapa;
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dataStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const { data: pData, error: pErr } = await (supabase
        .from("pedidos") as any)
        .select("historico_producao")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (pErr) throw pErr;

      const currentHist = Array.isArray(pData?.historico_producao) ? pData.historico_producao : [];
      const newEntry = { etapa: etapaLabel, data: dataStr };
      const updatedHist = [...currentHist, newEntry];

      const { error } = await (supabase
        .from("pedidos") as any)
        .update({ etapa, historico_producao: updatedHist })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    // ── onMutate: roda ANTES do mutationFn ─────────────────────────────────────────────
    // 1. Ativa flag para o Realtime não sobrescrever o estado otimístico.
    // 2. Captura snapshot e etapaAnterior ANTES de qualquer mudança no cache.
    // 3. Cancela refetches pendentes (não podem sobrescrever o update otimístico).
    // 4. Aplica update imuttável no cache (novo array, sem mutar o anterior).
    onMutate: async ({ id, etapa }) => {
      // Ativa o flag: bloqueia invalidações do Realtime durante o drag
      isDraggingMutation = true;
      await qc.cancelQueries({ queryKey: ["pedidos", user?.id] });
      const snapshot = qc.getQueryData<ReturnType<typeof mapRow>[]>(["pedidos", user?.id]);
      // Etapa real (pré-mudança) — passada ao mutationFn via variáveis
      const etapaAnterior = (snapshot?.find(p => p.id === id)?.etapa ?? null) as StatusEtapa | null;
      // Update imuttável: cria novo array sem mutar pedidos existentes
      const agora = new Date().toISOString();
      qc.setQueryData(["pedidos", user?.id], (old: ReturnType<typeof mapRow>[] | undefined) =>
        old ? old.map(p => p.id === id ? { ...p, etapa, atualizadoEm: agora } : p) : []
      );
      return { snapshot, etapaAnterior };
    },
    // ── onError: rollback imutável do cache ───────────────────────────────────────────
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        qc.setQueryData(["pedidos", user?.id], ctx.snapshot);
      }
    },
    // ── onSuccess: invalida a query após o banco confirmar ──────────────────────
    onSuccess: (_d, vars) => {
      // Invalida para sincronizar com dados frescos do banco.
      // O flag isDraggingMutation será desativado em onSettled.
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["etapas_pedido", vars.id] });
    },
    // ── onSettled: sempre desativa o flag (sucesso ou erro) ────────────────────
    onSettled: () => {
      // Libera o Realtime para processar invalidações novamente
      isDraggingMutation = false;
    },
  });
}


export function useEtapasHistorico(pedidoId: string | undefined) {
  const { user } = useAuth();
  return useQuery<{ id: string; etapa_anterior: string | null; etapa_nova: string; observacao: string | null; created_at: string }[]>({
    queryKey: ["etapas_pedido", pedidoId, user?.id],
    enabled: !!pedidoId && !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await (supabase
        .from("pedidos") as any)
        .select("historico_producao")
        .eq("id", pedidoId!)
        .eq("user_id", user.id)
        .single();
      if (error) throw error;

      const rawHist = Array.isArray(data?.historico_producao) ? data.historico_producao : [];
      return rawHist.map((entry: any, index: number) => {
        const matchingEtapa = ETAPAS.find(e => e.label === entry.etapa || e.id === entry.etapa);
        return {
          id: String(index),
          etapa_anterior: null,
          etapa_nova: matchingEtapa ? matchingEtapa.id : entry.etapa,
          observacao: null,
          created_at: entry.data,
        };
      });
    },
  });
}

export function usePagamentosPedido(pedidoId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pagamentos", pedidoId],
    enabled: !!pedidoId && !!user?.id,
    queryFn: async () => {
      if (!pedidoId) return [];
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id, valor, forma, pago_em, observacao, created_at")
        .eq("pedido_id", pedidoId)
        .order("pago_em", { ascending: false });
      if (error) throw error;
      return data as { id: string; valor: number; forma: string | null; pago_em: string; observacao: string | null; created_at: string }[];
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
  forma_pagamento?: string;
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

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dataStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const targetEtapa = input.etapa || "pedido-recebido";
      const etapaLabel = ETAPAS.find(e => e.id === targetEtapa)?.label || targetEtapa;

      const payload = {
        cliente_id: clienteId,
        produto: input.produto || "Produto não informado",
        tipo: input.tipo || null,
        material: input.material || null,
        cor: input.cor || null,
        observacoes: input.observacoes || null,
        entrega: input.entrega || null,
        etapa: targetEtapa,
        prioridade: input.prioridade || "media",
        valor_total: Number(input.valor_total) || 0,
        valor_pago: Number(input.valor_pago) || 0,
        numero: String(Math.floor(100000 + Math.random() * 900000)),
        user_id: user.id,
        anexos: input.anexos || [],
        historico_producao: [
          { etapa: etapaLabel, data: dataStr }
        ],
      };

      const { data: pedido, error: e2 } = await (supabase
        .from("pedidos") as any)
        .insert(payload)
        .select("id")
        .single();
      if (e2) throw e2;

      // 4. Inserir pagamento inicial se houver valor pago/entrada
      if (Number(input.valor_pago) > 0) {
        const { error: e3 } = await supabase
          .from("pagamentos")
          .insert({
            pedido_id: pedido.id,
            valor: Number(input.valor_pago),
            forma: input.forma_pagamento || "Pix",
            pago_em: new Date().toISOString().split("T")[0],
            observacao: "Pagamento inicial / entrada",
          });
        if (e3) throw e3;
      }

      return pedido.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["all_pagamentos"] });
    },
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

      // Fetch current order stage and history
      const { data: pData, error: pErr } = await (supabase
        .from("pedidos") as any)
        .select("etapa, historico_producao")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      let updatedHist = pData?.historico_producao;
      if (!pErr && pData) {
        if (pData.etapa !== input.etapa) {
          const currentHist = Array.isArray(pData.historico_producao) ? pData.historico_producao : [];
          const etapaLabel = ETAPAS.find(e => e.id === input.etapa)?.label || input.etapa;
          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, "0");
          const dataStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
          updatedHist = [...currentHist, { etapa: etapaLabel, data: dataStr }];
        }
      }

      const { error } = await (supabase
        .from("pedidos") as any)
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
          historico_producao: updatedHist,
        })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;

      // Try to find the payment by exact observation first
      let { data: existingPags, error: fetchErr } = await supabase
        .from("pagamentos")
        .select("id, valor, forma, observacao")
        .eq("pedido_id", id)
        .eq("observacao", "Pagamento inicial / entrada")
        .maybeSingle();

      // Fallback: locate the oldest payment row for this order
      if (!fetchErr && !existingPags) {
        const { data: oldestPag, error: fallbackErr } = await supabase
          .from("pagamentos")
          .select("id, valor, forma, observacao")
          .eq("pedido_id", id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!fallbackErr && oldestPag) {
          existingPags = oldestPag;
        } else if (fallbackErr) {
          fetchErr = fallbackErr;
        }
      }

      if (!fetchErr) {
        if (existingPags) {
          if (Number(input.valor_pago) > 0) {
            const { error: ue } = await supabase
              .from("pagamentos")
              .update({
                valor: Number(input.valor_pago),
                forma: input.forma_pagamento || "Pix",
                observacao: existingPags.observacao || "Pagamento inicial / entrada",
              })
              .eq("id", existingPags.id);
            if (ue) throw ue;
          } else {
            const { error: de } = await supabase
              .from("pagamentos")
              .delete()
              .eq("id", existingPags.id);
            if (de) throw de;
          }
        } else if (Number(input.valor_pago) > 0) {
          const { error: ie } = await supabase
            .from("pagamentos")
            .insert({
              pedido_id: id,
              valor: Number(input.valor_pago),
              forma: input.forma_pagamento || "Pix",
              pago_em: new Date().toISOString().split("T")[0],
              observacao: "Pagamento inicial / entrada",
            });
          if (ie) throw ie;
        }
      } else {
        throw fetchErr;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedido", v.id] });
      qc.invalidateQueries({ queryKey: ["etapas_pedido", v.id] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["pagamentos"] });
      qc.invalidateQueries({ queryKey: ["pagamentos", v.id] });
      qc.invalidateQueries({ queryKey: ["all_pagamentos"] });
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
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dataStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const etapaLabel = ETAPAS.find(e => e.id === "pedido-recebido")?.label || "Pedido Recebido";

      const { data: novo, error: e2 } = await (supabase
        .from("pedidos") as any)
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
          historico_producao: [
            { etapa: etapaLabel, data: dataStr }
          ],
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
    mutationFn: async ({ pedido_id, valor, forma, pago_em, observacao }: { pedido_id: string; valor: number; forma?: string; pago_em?: string; observacao?: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      // increment valor_pago atomically via re-read
      const { data: p, error: pErr } = await supabase.from("pedidos").select("valor_pago").eq("id", pedido_id).eq("user_id", user.id).single();
      if (pErr) throw pErr;
      
      const novoValorPago = Number(p.valor_pago || 0) + Number(valor);
      const { error: updateErr } = await supabase
        .from("pagamentos")
        .insert({ pedido_id, valor: Number(valor), forma: forma ?? null, pago_em: pago_em ?? new Date().toISOString().split("T")[0], observacao: observacao ?? null });
      if (updateErr) throw updateErr;
      const { error: paidErr } = await supabase.from("pedidos").update({ valor_pago: novoValorPago }).eq("id", pedido_id).eq("user_id", user.id);
      if (paidErr) throw paidErr;
    },
    onMutate: async ({ pedido_id, valor }) => {
      await qc.cancelQueries({ queryKey: ["pedidos", user?.id] });
      const snapshot = qc.getQueryData<any[]>(["pedidos", user?.id]);
      qc.setQueryData(["pedidos", user?.id], (old: any[] | undefined) =>
        old ? old.map(p => p.id === pedido_id ? { ...p, valorPago: Number(p.valorPago || 0) + Number(valor) } : p) : []
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        qc.setQueryData(["pedidos", user?.id], ctx.snapshot);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["pagamentos"] });
      qc.invalidateQueries({ queryKey: ["pagamentos", v.pedido_id] });
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedido", v.pedido_id] });
      qc.invalidateQueries({ queryKey: ["all_pagamentos"] });
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

      // Deleta pagamentos associados primeiro para evitar erro de integridade (chave estrangeira)
      await supabase.from("pagamentos").delete().eq("pedido_id", id);
      const { error } = await supabase.from("pedidos").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["pedidos", user?.id] });
      const snapshot = qc.getQueryData<any[]>(["pedidos", user?.id]);
      qc.setQueryData(["pedidos", user?.id], (old: any[] | undefined) =>
        old ? old.filter(p => p.id !== id) : []
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        qc.setQueryData(["pedidos", user?.id], ctx.snapshot);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["all_pagamentos"] });
    },
  });
}

export interface NovaVendaDiretaInput {
  descricao: string;
  valor: number;
  data: string; // YYYY-MM-DD
  formaPagamento: string;
  clienteNome?: string;
}

export function useCreateVendaDireta() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: NovaVendaDiretaInput) => {
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Encontrar ou criar um cliente genérico "Venda de Balcão" para este usuário
      let genericClienteId = "";
      const { data: existingCli, error: getErr } = await supabase
        .from("clientes")
        .select("id")
        .eq("nome", "Venda de Balcão")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!getErr && existingCli) {
        genericClienteId = existingCli.id;
      } else {
        const { data: newCli, error: insertErr } = await supabase
          .from("clientes")
          .insert({
            nome: "Venda de Balcão",
            user_id: user.id,
          })
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        genericClienteId = newCli.id;
      }

      // 2. Preparar payload do pedido com etapa 'entregue'
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const createdAtStr = `${input.data}T${timeStr}.000Z`;

      const payload = {
        cliente_id: genericClienteId,
        cliente_nome: input.clienteNome?.trim() || "Venda de Balcão",
        produto: input.descricao || "Venda de Balcão",
        etapa: "entregue" as const,
        prioridade: "media" as const,
        valor_total: Number(input.valor) || 0,
        valor_pago: Number(input.valor) || 0,
        numero: String(Math.floor(100000 + Math.random() * 900000)),
        user_id: user.id,
        created_at: createdAtStr,
        entrega: input.data,
        historico_producao: [
          { etapa: "Entregue", data: `${input.data} ${timeStr}` }
        ],
      };

      // 3. Inserir pedido
      const { data: pedido, error: e2 } = await (supabase
        .from("pedidos") as any)
        .insert(payload)
        .select("id")
        .single();
      if (e2) throw e2;
      const pedidoId = pedido.id;

      // 4. Inserir pagamento
      const { error: e3 } = await supabase
        .from("pagamentos")
        .insert({
          pedido_id: pedidoId,
          valor: Number(input.valor),
          forma: input.formaPagamento,
          pago_em: input.data,
          observacao: "Venda direta de balcão",
        });
      if (e3) throw e3;

      return pedidoId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["all_pagamentos"] });
    },
  });
}

export function useAllPagamentos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all_pagamentos", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Fetch both pagamentos and pedidos in parallel
      const [pagamentosRes, pedidosRes] = await Promise.all([
        supabase
          .from("pagamentos")
          .select(`
            id,
            valor,
            forma,
            pago_em,
            observacao,
            created_at,
            pedidos (
              id,
              produto,
              numero,
              user_id,
              cliente_nome,
              clientes (
                nome
              )
            )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("pedidos")
          .select(`
            id,
            produto,
            numero,
            valor_pago,
            valor_total,
            created_at,
            entrega,
            etapa,
            user_id,
            cliente_nome,
            clientes (
              nome
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      ]);

      if (pagamentosRes.error) throw pagamentosRes.error;
      if (pedidosRes.error) throw pedidosRes.error;

      // 1. Process pagamentos
      const userPayments = (pagamentosRes.data || [])
        .filter((p) => p.pedidos && p.pedidos.user_id === user.id)
        .map((p) => ({
          id: p.id,
          valor: Number(p.valor),
          forma: p.forma,
          pago_em: p.pago_em,
          created_at: p.created_at,
          observacao: p.observacao,
          pedido: {
            id: p.pedidos.id,
            produto: p.pedidos.produto,
            numero: p.pedidos.numero,
            clienteNome: p.pedidos.cliente_nome || p.pedidos.clientes?.nome || "—",
          },
        }));

      // 2. Process active orders that have valor_pago > 0 but are not represented in the pagamentos table
      const paymentPedidoIds = new Set(userPayments.map((p) => p.pedido.id));
      const ordersAsSales = (pedidosRes.data || [])
        .filter((p) => {
          const etapaLower = String(p.etapa || "").toLowerCase();
          const isActive = !(
            etapaLower === "cancelado" ||
            etapaLower === "cancelada" ||
            etapaLower === "excluido" ||
            etapaLower === "excluído"
          );
          return isActive && Number(p.valor_pago) > 0 && !paymentPedidoIds.has(p.id);
        })
        .map((p) => ({
          id: p.id,
          valor: Number(p.valor_pago),
          forma: "Não informado",
          pago_em: p.entrega || p.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
          created_at: p.created_at,
          observacao: "Venda Direta",
          pedido: {
            id: p.id,
            produto: p.produto,
            numero: p.numero,
            clienteNome: p.cliente_nome || p.clientes?.nome || "—",
          },
        }));

      // 3. Combine and sort by created_at descending
      const combined = [...userPayments, ...ordersAsSales];
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return combined;
    },
  });
}
