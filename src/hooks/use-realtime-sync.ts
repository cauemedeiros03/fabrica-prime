import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Subscribe once to all relevant tables and invalidate caches on any change. */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("realtime-marcena")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
        qc.invalidateQueries({ queryKey: ["pedidos"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pagamentos" }, () => {
        qc.invalidateQueries({ queryKey: ["pagamentos"] });
        qc.invalidateQueries({ queryKey: ["pedidos"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "etapas_pedido" }, () => {
        qc.invalidateQueries({ queryKey: ["etapas_pedido"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => {
        qc.invalidateQueries({ queryKey: ["pedidos"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
