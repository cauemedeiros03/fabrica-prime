import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, PackagePlus, AlertTriangle, Wallet, CheckCircle2, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { usePedidos } from "@/hooks/use-pedidos";
import { toast } from "sonner";

import {
  buildNotifications,
  getReadIds,
  setReadIds,
  getDismissedIds,
  setDismissedIds,
  tempo,
  type Notif,
} from "@/lib/notifications";

const ICON: Record<Notif["tipo"], React.ComponentType<{ className?: string }>> = {
  novo: PackagePlus,
  atrasado: AlertTriangle,
  pagamento: Wallet,
  concluido: CheckCircle2,
  etapa: PackagePlus,
};
const COR: Record<Notif["tipo"], string> = {
  novo: "text-info bg-info/10",
  atrasado: "text-destructive bg-destructive/10",
  pagamento: "text-success bg-success/10",
  concluido: "text-success bg-success/10",
  etapa: "text-primary bg-primary/10",
};

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: pedidos = [] } = usePedidos();

  const [readIds, setRead] = useState<Set<string>>(() => getReadIds());
  const [dismissedIds, setDismissed] = useState<Set<string>>(() => getDismissedIds());

  // Todas as notificações geradas dos pedidos
  const allNotifs = useMemo(() => buildNotifications(pedidos), [pedidos]);

  // Filtra as descartadas ("limpas")
  const notifs = useMemo(
    () => allNotifs.filter((n) => !dismissedIds.has(n.id)),
    [allNotifs, dismissedIds]
  );

  const naoLidas = notifs.filter((n) => !readIds.has(n.id)).length;

  // Fecha ao clicar fora do popover
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const marcarTodas = useCallback(() => {
    const all = new Set(notifs.map((n) => n.id));
    setRead(all);
    setReadIds(all);
  }, [notifs]);

  const marcarUma = useCallback((id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setRead(next);
    setReadIds(next);
  }, [readIds]);

  /**
   * Limpar todas as notificações:
   * 1. Descarta os IDs visíveis no localStorage (dismissed)
   * 2. Também marca como lidas (garante badge zerado)
   * 3. Atualização otimista imediata do estado local
   * 4. Toast de confirmação
   *
   * Nota: As notificações são derivadas dos pedidos (não têm tabela própria).
   * O "descarte" é persistido no localStorage e filtra a lista na próxima renderização.
   */
  const handleClearNotifications = useCallback(() => {
    try {
      if (notifs.length === 0) return;

      // Mescla os IDs atuais com os já descartados
      const newDismissed = new Set([...dismissedIds, ...notifs.map((n) => n.id)]);
      const newRead = new Set([...readIds, ...notifs.map((n) => n.id)]);

      // Atualização otimista — a UI reage imediatamente
      setDismissed(newDismissed);
      setRead(newRead);

      // Persiste no localStorage
      setDismissedIds(newDismissed);
      setReadIds(newRead);

      toast.success("Notificações limpas com sucesso");
      setOpen(false);
    } catch (err) {
      console.error("[Notificações] Erro ao limpar:", err);
      toast.error("Não foi possível limpar as notificações");
    }
  }, [notifs, dismissedIds, readIds]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="size-9 grid place-items-center rounded-lg border hover:bg-accent transition relative"
        aria-label="Notificações"
      >
        <Bell className="size-4" />
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold grid place-items-center">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-[22rem] max-w-[92vw] rounded-xl border bg-popover shadow-[var(--shadow-elevated)] z-50 overflow-hidden">
          {/* CABEÇALHO */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <p className="text-sm font-semibold">Notificações</p>
              <p className="text-[11px] text-muted-foreground">{naoLidas} não lidas</p>
            </div>

            {notifs.length > 0 && (
              <div className="flex items-center gap-1">
                {/* Marcar todas como lidas */}
                <button
                  onClick={marcarTodas}
                  title="Marcar todas como lidas"
                  className="h-7 px-2 text-xs text-primary hover:bg-primary/10 rounded-md inline-flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="size-3.5" />
                  Marcar
                </button>

                {/* Separador visual */}
                <span className="w-px h-4 bg-border" />

                {/* Limpar todas */}
                <button
                  onClick={handleClearNotifications}
                  title="Limpar todas as notificações"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md inline-flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                  Limpar
                </button>
              </div>
            )}
          </div>

          {/* LISTA */}
          <div className="max-h-[28rem] overflow-auto divide-y">
            {notifs.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nenhuma novidade por aqui.
              </div>
            )}
            {notifs.map((n) => {
              const Icon = ICON[n.tipo];
              const lida = readIds.has(n.id);
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    marcarUma(n.id);
                    setOpen(false);
                    if (n.tipo === "atrasado" || n.tipo === "concluido") navigate({ to: "/entregas" });
                    else navigate({ to: "/pedidos" });
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-accent transition flex gap-3 ${lida ? "opacity-60" : ""}`}
                >
                  <div className={`size-8 rounded-lg grid place-items-center shrink-0 ${COR[n.tipo]}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium truncate">{n.titulo}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{tempo(n.data)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{n.descricao}</p>
                  </div>
                  {!lida && <span className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
