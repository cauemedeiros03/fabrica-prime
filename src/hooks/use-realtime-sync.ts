import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isDraggingMutation } from "@/hooks/use-pedidos";

/** Subscribe once to all relevant tables and invalidate caches on any change. */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("realtime-marcena")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
        // Ignora eventos de banco enquanto uma mutação de etapa (drag) está ativa.
        // O próprio write do Supabase dispara este evento, mas o onSettled da
        // mutação já cuida da invalidação no momento certo — após o banco confirmar.
        if (isDraggingMutation) return;
        qc.invalidateQueries({ queryKey: ["pedidos"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "etapas_pedido" }, () => {
        qc.invalidateQueries({ queryKey: ["etapas_pedido"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => {
        if (isDraggingMutation) return;
        qc.invalidateQueries({ queryKey: ["pedidos"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

