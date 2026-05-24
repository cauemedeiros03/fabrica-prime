import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { moeda, dataBR } from "@/lib/mock-data";
import { usePedidos } from "@/hooks/use-pedidos";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { CheckCircle2, AlertCircle, Clock, Trash2, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useDespesas, useCreateDespesa, useDeleteDespesa } from "@/hooks/use-despesas";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro")({
  component: FinanceiroPage,
  head: () => ({ meta: [{ title: "Financeiro · Sua bancada" }] }),
  validateSearch: (s: Record<string, unknown>): { filtro?: "pendentes" } => ({
    filtro: s.filtro === "pendentes" ? "pendentes" : undefined,
  }),
});

function FinanceiroPage() {
  const { filtro } = Route.useSearch();
  const { data: PEDIDOS = [] } = usePedidos();
  const { data: despesas = [] } = useDespesas();

  const [activeTab, setActiveTab] = useState<"receber" | "despesas">("receber");
  const [openNewDespesa, setOpenNewDespesa] = useState(false);
  const [newDescricao, setNewDescricao] = useState("");
  const [newValor, setNewValor] = useState("");
  const [newData, setNewData] = useState(new Date().toISOString().split("T")[0]);
  const [salvando, setSalvando] = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = useState<string | null>(null);

  const createDespesa = useCreateDespesa();
  const deleteDespesa = useDeleteDespesa();

  const recebido = PEDIDOS.reduce((s, p) => s + p.valorPago, 0);
  const aReceber = PEDIDOS.reduce((s, p) => s + (p.valorTotal - p.valorPago), 0);
  const faturado = recebido + aReceber;
  const pendentes = PEDIDOS.filter((p) => p.valorPago < p.valorTotal);

  const chartData = useMemo(() => {
    const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const result = [];
    const hoje = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      
      const receita = PEDIDOS.reduce((acc, p) => {
        const pDate = new Date(p.criadoEm);
        if (pDate.getFullYear() === year && pDate.getMonth() === month) {
          return acc + p.valorTotal;
        }
        return acc;
      }, 0);
      
      const custo = despesas.reduce((acc, dsp) => {
        const dDate = new Date(dsp.data + "T00:00:00");
        if (dDate.getFullYear() === year && dDate.getMonth() === month) {
          return acc + Number(dsp.valor);
        }
        return acc;
      }, 0);
      
      result.push({
        mes: mesesNomes[month],
        receita,
        custo,
      });
    }
    return result;
  }, [PEDIDOS, despesas]);

  const handleSalvarDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescricao.trim() || !newValor || !newData) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSalvando(true);
    try {
      await createDespesa.mutateAsync({
        descricao: newDescricao,
        valor: Number(newValor),
        data: newData,
      });
      toast.success("Despesa lançada com sucesso!");
      setNewDescricao("");
      setNewValor("");
      setNewData(new Date().toISOString().split("T")[0]);
      setOpenNewDespesa(false);
    } catch (err: any) {
      toast.error("Erro ao lançar despesa", {
        description: err.message || "",
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirDespesa = async () => {
    if (!confirmarExcluir) return;
    try {
      await deleteDespesa.mutateAsync(confirmarExcluir);
      toast.success("Despesa excluída com sucesso");
      setConfirmarExcluir(null);
    } catch (err: any) {
      toast.error("Erro ao excluir despesa", {
        description: err.message || "",
      });
    }
  };

  return (
    <AppShell title="Financeiro" subtitle={filtro === "pendentes" ? `${pendentes.length} pagamentos pendentes` : "Controle completo de receitas e recebíveis"}>
      {filtro === "pendentes" && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border bg-accent/30 px-3 py-2 text-sm">
          <Clock className="size-4 text-warning-foreground" />
          <span>Filtro ativo:</span>
          <span className="font-medium">Pagamentos pendentes</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { l: "Recebido", v: recebido, i: CheckCircle2, c: "text-success", bg: "bg-success/10" },
          { l: "A receber", v: aReceber, i: Clock, c: "text-warning-foreground", bg: "bg-warning/20" },
          { l: "Total faturado", v: faturado, i: AlertCircle, c: "text-info", bg: "bg-info/10" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.l}</p>
              <div className={`size-9 grid place-items-center rounded-lg ${s.bg} ${s.c}`}>
                <s.i className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{moeda(s.v)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] mt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold tracking-tight">Receita vs custos</p>
            <p className="text-xs text-muted-foreground">Últimos 7 meses</p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -10, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => moeda(v)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receita" name="Receita" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="custo" name="Custo" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border bg-card mt-4 shadow-[var(--shadow-soft)] overflow-hidden">
        <div className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b">
          <div>
            <p className="font-semibold tracking-tight">
              {activeTab === "receber" ? "Pagamentos pendentes" : "Fluxo de Caixa / Despesas"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeTab === "receber"
                ? `${pendentes.length} pedidos com saldo em aberto`
                : `${despesas.length} despesa(s) registrada(s)`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-9 p-0.5 bg-muted rounded-lg flex items-center shrink-0">
              <button
                onClick={() => setActiveTab("receber")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === "receber" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Receber
              </button>
              <button
                onClick={() => setActiveTab("despesas")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === "despesas" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Despesas
              </button>
            </div>

            {activeTab === "despesas" && (
              <button
                onClick={() => setOpenNewDespesa(true)}
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition shrink-0"
              >
                + Lançar Gasto
              </button>
            )}
          </div>
        </div>

        {activeTab === "receber" ? (
          <div className="divide-y">
            {pendentes.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Nenhum pagamento pendente.
              </div>
            ) : (
              pendentes.map((p) => {
                const restante = p.valorTotal - p.valorPago;
                const pct = (p.valorPago / p.valorTotal) * 100;
                return (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/10 transition">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {p.cliente} <span className="text-muted-foreground font-normal">— {p.numero}</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{p.produto}</p>
                    </div>
                    <div className="hidden md:block w-40">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Pago</span>
                        <span className="tabular-nums">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{moeda(restante)}</p>
                      <p className="text-[11px] text-muted-foreground">vence {dataBR(p.entrega)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {despesas.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Nenhuma despesa registrada. Clique em "+ Lançar Gasto" para começar.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b">
                  <tr>
                    <th className="text-left font-medium pl-5 pr-4 py-2.5">Descrição</th>
                    <th className="text-left font-medium px-4 py-2.5">Data</th>
                    <th className="text-right font-medium px-4 py-2.5">Valor</th>
                    <th className="px-5 py-2.5 text-right w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {despesas.map((dsp) => {
                    const dataFormatada = new Date(dsp.data + "T00:00:00").toLocaleDateString("pt-BR");
                    return (
                      <tr key={dsp.id} className="hover:bg-accent/20 transition group">
                        <td className="pl-5 pr-4 py-3 font-medium text-foreground">
                          {dsp.descricao}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {dataFormatada}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-destructive tabular-nums">
                          -{moeda(Number(dsp.valor))}
                        </td>
                        <td className="pl-4 pr-5 py-3 text-right">
                          <button
                            onClick={() => setConfirmarExcluir(dsp.id)}
                            className="size-8 grid place-items-center rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition"
                            title="Remover Despesa"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal Lançar Gasto */}
      {openNewDespesa && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => setOpenNewDespesa(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-[var(--shadow-elevated)]"
          >
            <h3 className="font-semibold tracking-tight text-lg mb-4">Lançar Despesa / Gasto</h3>
            <form onSubmit={handleSalvarDespesa} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  required
                  value={newDescricao}
                  onChange={(e) => setNewDescricao(e.target.value)}
                  placeholder="Ex: Compra de parafusos, Luz, Aluguel"
                  className="w-full h-10 px-3 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newValor}
                    onChange={(e) => setNewValor(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 px-3 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={newData}
                    onChange={(e) => setNewData(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setOpenNewDespesa(false)}
                  className="h-10 px-4 rounded-lg border text-sm hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {salvando && <Loader2 className="size-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Exclusão */}
      {confirmarExcluir && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmarExcluir(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card border p-6 shadow-[var(--shadow-elevated)]"
          >
            <h3 className="font-semibold tracking-tight text-lg">Remover despesa?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Deseja realmente remover esta despesa permanentemente? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setConfirmarExcluir(null)}
                className="h-9 px-4 rounded-lg border text-sm hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={handleExcluirDespesa}
                className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
