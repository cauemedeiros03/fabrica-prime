import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ETAPAS, dataBR, moeda, PRIORIDADE_LABEL } from "@/lib/mock-data";
import { usePedidos, useReagendarEntrega } from "@/hooks/use-pedidos";
import { ChevronLeft, ChevronRight, CalendarClock, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/agenda")({
  component: AgendaPage,
  head: () => ({ meta: [{ title: "Agenda · Sua bancada" }] }),
});

const PRIO_BORDER: Record<string, string> = {
  baixa: "border-l-muted-foreground/40",
  media: "border-l-info",
  alta: "border-l-warning",
  urgente: "border-l-destructive",
};

function AgendaPage() {
  const navigate = useNavigate();
  const { data: PEDIDOS = [] } = usePedidos();
  const reagendar = useReagendarEntrega();

  const hoje = new Date();
  const [cursor, setCursor] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(hoje.getDate());

  const ano = cursor.getFullYear();
  const mes = cursor.getMonth();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const nomeMes = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const eventosPorDia = useMemo(() => {
    const m = new Map<number, typeof PEDIDOS>();
    PEDIDOS.forEach((p) => {
      const d = new Date(p.entrega);
      if (d.getMonth() === mes && d.getFullYear() === ano) {
        const arr = m.get(d.getDate()) ?? [];
        arr.push(p);
        m.set(d.getDate(), arr);
      }
    });
    return m;
  }, [PEDIDOS, mes, ano]);

  const dias: (number | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  const eventosDoDia = diaSelecionado ? eventosPorDia.get(diaSelecionado) ?? [] : [];
  const tituloDia = diaSelecionado
    ? new Date(ano, mes, diaSelecionado).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
    : "";

  return (
    <AppShell title="Agenda de entregas" subtitle="Visualize, reagende e abra cada entrega">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold tracking-tight capitalize">{nomeMes}</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCursor(new Date(ano, mes - 1, 1))}
                className="size-8 grid place-items-center rounded-md hover:bg-accent"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                  setDiaSelecionado(d.getDate());
                }}
                className="px-2 h-8 rounded-md hover:bg-accent text-xs font-medium"
              >
                Hoje
              </button>
              <button
                onClick={() => setCursor(new Date(ano, mes + 1, 1))}
                className="size-8 grid place-items-center rounded-md hover:bg-accent"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-1 uppercase tracking-wider">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-1 font-medium">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {dias.map((d, idx) => {
              const evs = d ? eventosPorDia.get(d) ?? [] : [];
              const isHoje =
                d === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
              const isSelected = d === diaSelecionado;
              const dataDia = d ? new Date(ano, mes, d) : null;
              const temAtrasado = evs.some(
                (p) => dataDia && dataDia < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()) && p.etapa !== "entregue",
              );
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!d}
                  onClick={() => d && setDiaSelecionado(d)}
                  className={`min-h-24 rounded-lg border p-1.5 text-left transition ${
                    !d
                      ? "bg-transparent border-transparent"
                      : isSelected
                        ? "bg-primary/5 border-primary/50 ring-2 ring-primary/20"
                        : "bg-card hover:bg-accent/50"
                  }`}
                >
                  {d && (
                    <>
                      <div className={`flex items-center justify-between text-xs font-medium tabular-nums mb-1 ${isHoje ? "text-primary" : "text-muted-foreground"}`}>
                        {isHoje ? (
                          <span className="inline-grid place-items-center size-5 rounded-full bg-primary text-primary-foreground">{d}</span>
                        ) : (
                          <span>{d}</span>
                        )}
                        {temAtrasado && <AlertTriangle className="size-3 text-destructive" />}
                      </div>
                      <div className="space-y-0.5">
                        {evs.slice(0, 2).map((p) => {
                          const etapa = ETAPAS.find((e) => e.id === p.etapa)!;
                          return (
                            <div
                              key={p.id}
                              className={`text-[10px] truncate rounded px-1 py-0.5 font-medium border-l-2 ${PRIO_BORDER[p.prioridade]}`}
                              style={{ backgroundColor: `color-mix(in oklab, ${etapa.cor} 14%, transparent)`, color: etapa.cor }}
                              title={`${p.numero} — ${p.produto} · ${PRIORIDADE_LABEL[p.prioridade]}`}
                            >
                              {p.numero} {p.cliente.split(" ")[0]}
                            </div>
                          );
                        })}
                        {evs.length > 2 && (
                          <div className="text-[10px] text-muted-foreground">+{evs.length - 2}</div>
                        )}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          {diaSelecionado ? (
            <>
              <p className="font-semibold tracking-tight capitalize">{tituloDia}</p>
              <p className="text-xs text-muted-foreground mb-4">
                {eventosDoDia.length} entrega(s) prevista(s)
              </p>
              {eventosDoDia.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhuma entrega nesta data.
                </p>
              ) : (
                <ul className="space-y-2">
                  {eventosDoDia.map((p) => {
                    const etapa = ETAPAS.find((e) => e.id === p.etapa)!;
                    const saldo = p.valorTotal - p.valorPago;
                    return (
                      <li
                        key={p.id}
                        className={`group rounded-lg border-l-4 ${PRIO_BORDER[p.prioridade]} border bg-background p-3 hover:bg-accent/40 transition cursor-pointer`}
                        onClick={() => navigate({ to: "/pedidos/$pedidoId", params: { pedidoId: p.id } })}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.produto}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {p.cliente} · {p.numero}
                            </p>
                          </div>
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ backgroundColor: `color-mix(in oklab, ${etapa.cor} 14%, transparent)`, color: etapa.cor }}
                          >
                            {etapa.label}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Saldo: <span className="tabular-nums font-medium text-foreground">{moeda(saldo)}</span>
                          </span>
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <CalendarClock className="size-3 text-muted-foreground" />
                            <input
                              type="date"
                              defaultValue={new Date(p.entrega).toISOString().slice(0, 10)}
                              onChange={async (e) => {
                                const v = e.target.value;
                                if (!v) return;
                                try {
                                  await reagendar.mutateAsync({ id: p.id, entrega: v });
                                  toast.success(`Entrega de ${p.numero} reagendada`);
                                } catch (err) {
                                  toast.error("Erro ao reagendar", { description: err instanceof Error ? err.message : "" });
                                }
                              }}
                              className="h-7 px-1.5 rounded border bg-background text-[11px] focus:outline-none focus:ring-2 focus:ring-ring/30"
                            />
                            {reagendar.isPending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <>
              <p className="font-semibold tracking-tight mb-1">Próximos prazos</p>
              <p className="text-xs text-muted-foreground mb-4">Selecione uma data no calendário</p>
              <div className="space-y-3">
                {[...PEDIDOS]
                  .filter((p) => p.etapa !== "entregue")
                  .sort((a, b) => +new Date(a.entrega) - +new Date(b.entrega))
                  .slice(0, 6)
                  .map((p) => (
                    <div key={p.id} className="flex items-start gap-3 cursor-pointer hover:opacity-80" onClick={() => navigate({ to: "/pedidos/$pedidoId", params: { pedidoId: p.id } })}>
                      <div className="size-10 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
                        {dataBR(p.entrega).split(" ")[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.produto}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.cliente} · {p.numero}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
