import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ClienteDialog, ClienteDetailSheet } from "@/components/cliente-dialog";
import {
  useClientes,
  useDeleteCliente,
  type ClienteInput,
  type Cliente,
} from "@/hooks/use-clientes";
import { usePedidos } from "@/hooks/use-pedidos";
import { moeda } from "@/lib/mock-data";
import {
  Phone,
  MapPin,
  Mail,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes")({
  component: ClientesPage,
  head: () => ({ meta: [{ title: "Clientes · Marcena" }] }),
});

function ClientesPage() {
  const { data: clientes = [], isLoading } = useClientes();
  const { data: pedidos = [] } = usePedidos();
  const del = useDeleteCliente();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<(ClienteInput & { id: string }) | null>(null);
  const [confirmar, setConfirmar] = useState<Cliente | null>(null);
  const [detailClienteId, setDetailClienteId] = useState<string | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  const stats = useMemo(() => {
    const m = new Map<string, { pedidos: number; total: number }>();
    pedidos.forEach((p) => {
      const cId = (p as unknown as { clienteId?: string }).clienteId;
      if (!cId) return;
      const cur = m.get(cId) ?? { pedidos: 0, total: 0 };
      cur.pedidos++;
      cur.total += p.valorTotal;
      m.set(cId, cur);
    });
    return m;
  }, [pedidos]);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? clientes
      : clientes.filter(
          (c) =>
            c.nome.toLowerCase().includes(q) ||
            (c.telefone ?? "").toLowerCase().includes(q) ||
            (c.email ?? "").toLowerCase().includes(q) ||
            (c.cidade ?? "").toLowerCase().includes(q),
        );
    return list.sort((a, b) => {
      const sa = stats.get(a.id)?.total ?? 0;
      const sb = stats.get(b.id)?.total ?? 0;
      return sb - sa;
    });
  }, [clientes, query, stats]);

  const abrirEditar = (c: Cliente) =>
    setEdit({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone ?? "",
      email: c.email ?? "",
      cidade: c.cidade ?? "",
      observacoes: c.observacoes ?? "",
    });

  const apagar = async () => {
    if (!confirmar) return;
    try {
      await del.mutateAsync(confirmar.id);
      toast.success(`${confirmar.nome} removido`);
    } catch (e) {
      toast.error("Não foi possível remover", {
        description: e instanceof Error ? e.message : "",
      });
    }
    setConfirmar(null);
  };

  return (
    <AppShell title="Clientes" subtitle={`${clientes.length} cliente(s) cadastrado(s)`}>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, telefone, email ou cidade..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <button
          onClick={() => setOpen(true)}
          className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="size-4" /> Novo cliente
        </button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <Users className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">Nenhum cliente encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            {query ? "Tente outro termo de busca." : "Cadastre o primeiro cliente para começar."}
          </p>
          {!query && (
            <button
              onClick={() => setOpen(true)}
              className="mt-4 h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              <Plus className="size-4" /> Cadastrar cliente
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((c) => {
            const s = stats.get(c.id) ?? { pedidos: 0, total: 0 };
            const inic = c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("");
            return (
              <div
                key={c.id}
                className="group rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] transition relative"
              >
                <div
                  onClick={() => {
                    setDetailClienteId(c.id);
                    setOpenDetail(true);
                  }}
                  className="block cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground grid place-items-center font-semibold text-sm">
                      {inic.toUpperCase() || "—"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold tracking-tight truncate">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.pedidos} pedido{s.pedidos !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    {c.telefone && (
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="size-3.5 shrink-0" /> {c.telefone}
                      </div>
                    )}
                    {c.cidade && (
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="size-3.5 shrink-0" /> {c.cidade}
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="size-3.5 shrink-0" /> {c.email}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total comprado</span>
                    <span className="font-semibold tabular-nums">{moeda(s.total)}</span>
                  </div>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirEditar(c);
                    }}
                    className="size-8 grid place-items-center rounded-lg border bg-card hover:bg-accent"
                    aria-label="Editar"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmar(c);
                    }}
                    className="size-8 grid place-items-center rounded-lg border border-destructive/30 bg-card text-destructive hover:bg-destructive/10"
                    aria-label="Remover"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ClienteDialog open={open} onOpenChange={setOpen} />
      <ClienteDialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        initial={edit}
      />
      <ClienteDetailSheet
        open={openDetail}
        onOpenChange={setOpenDetail}
        clienteId={detailClienteId}
      />

      {confirmar && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmar(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-[var(--shadow-elevated)]"
          >
            <h3 className="font-semibold tracking-tight">Remover {confirmar.nome}?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Esta ação não pode ser desfeita. Clientes com pedidos vinculados não podem ser removidos.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setConfirmar(null)}
                className="h-9 px-4 rounded-lg border text-sm hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={apagar}
                disabled={del.isPending}
                className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {del.isPending && <Loader2 className="size-4 animate-spin" />} Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
