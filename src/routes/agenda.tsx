import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PEDIDOS, ETAPAS, dataBR } from "@/lib/mock-data";

export const Route = createFileRoute("/agenda")({
  component: AgendaPage,
  head: () => ({ meta: [{ title: "Agenda · Marcena" }] }),
});

function AgendaPage() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const nomeMes = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const eventosPorDia = new Map<number, typeof PEDIDOS>();
  PEDIDOS.forEach((p) => {
    const d = new Date(p.entrega);
    if (d.getMonth() === mes && d.getFullYear() === ano) {
      const arr = eventosPorDia.get(d.getDate()) ?? [];
      arr.push(p);
      eventosPorDia.set(d.getDate(), arr);
    }
  });

  const dias: (number | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  return (
    <AppShell title="Agenda de entregas" subtitle="Visualize todos os prazos do mês">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <p className="font-semibold tracking-tight capitalize mb-4">{nomeMes}</p>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-1 uppercase tracking-wider">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-1 font-medium">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {dias.map((d, idx) => {
              const evs = d ? eventosPorDia.get(d) ?? [] : [];
              const isHoje = d === hoje.getDate();
              return (
                <div
                  key={idx}
                  className={`min-h-24 rounded-lg border p-1.5 text-left ${
                    d ? "bg-card hover:bg-accent/50" : "bg-transparent border-transparent"
                  } transition`}
                >
                  {d && (
                    <>
                      <div className={`text-xs font-medium tabular-nums mb-1 ${isHoje ? "text-primary" : "text-muted-foreground"}`}>
                        {isHoje ? (
                          <span className="inline-grid place-items-center size-5 rounded-full bg-primary text-primary-foreground">{d}</span>
                        ) : (
                          d
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {evs.slice(0, 2).map((p) => {
                          const etapa = ETAPAS.find((e) => e.id === p.etapa)!;
                          return (
                            <div
                              key={p.id}
                              className="text-[10px] truncate rounded px-1 py-0.5 font-medium"
                              style={{ backgroundColor: `color-mix(in oklab, ${etapa.cor} 16%, transparent)`, color: etapa.cor }}
                              title={`${p.numero} — ${p.produto}`}
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
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <p className="font-semibold tracking-tight mb-1">Próximos prazos</p>
          <p className="text-xs text-muted-foreground mb-4">Lembrete automático aos clientes</p>
          <div className="space-y-3">
            {[...PEDIDOS]
              .filter((p) => p.etapa !== "entregue")
              .sort((a, b) => +new Date(a.entrega) - +new Date(b.entrega))
              .slice(0, 6)
              .map((p) => (
                <div key={p.id} className="flex items-start gap-3">
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
        </div>
      </div>
    </AppShell>
  );
}
