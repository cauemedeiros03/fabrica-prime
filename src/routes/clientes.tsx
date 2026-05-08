import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PEDIDOS, moeda } from "@/lib/mock-data";
import { Phone, MapPin, Mail } from "lucide-react";

export const Route = createFileRoute("/clientes")({
  component: ClientesPage,
  head: () => ({ meta: [{ title: "Clientes · Marcena" }] }),
});

function ClientesPage() {
  const map = new Map<string, { cliente: string; telefone: string; cidade: string; pedidos: number; total: number }>();
  PEDIDOS.forEach((p) => {
    const cur = map.get(p.cliente) ?? { cliente: p.cliente, telefone: p.telefone, cidade: p.cidade, pedidos: 0, total: 0 };
    cur.pedidos++;
    cur.total += p.valorTotal;
    map.set(p.cliente, cur);
  });
  const clientes = [...map.values()].sort((a, b) => b.total - a.total);

  return (
    <AppShell title="Clientes" subtitle={`${clientes.length} clientes ativos`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientes.map((c) => {
          const inic = c.cliente.split(" ").map((n) => n[0]).slice(0, 2).join("");
          return (
            <div key={c.cliente} className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] transition">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground grid place-items-center font-semibold text-sm">
                  {inic}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight truncate">{c.cliente}</p>
                  <p className="text-xs text-muted-foreground">{c.pedidos} pedido{c.pedidos > 1 ? "s" : ""}</p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Phone className="size-3.5" /> {c.telefone}</div>
                <div className="flex items-center gap-2"><MapPin className="size-3.5" /> {c.cidade}</div>
                <div className="flex items-center gap-2"><Mail className="size-3.5" /> contato@email.com</div>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total comprado</span>
                <span className="font-semibold tabular-nums">{moeda(c.total)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
