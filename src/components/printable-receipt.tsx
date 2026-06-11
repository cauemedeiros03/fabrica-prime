import { forwardRef, useMemo } from "react";
import { moeda } from "@/lib/mock-data";

interface PrintableReceiptProps {
  pedido: any;
  config: any;
}

function cleanLatexMedidas(medidas: string): string {
  if (!medidas) return "";
  // Remove math mode symbols '$'
  let clean = medidas.replace(/\$/g, "");
  // Replace LaTeX \times with ' x ' (case-insensitive)
  clean = clean.replace(/\\times/gi, " x ");
  // Replace double spaces
  clean = clean.replace(/\s+/g, " ");
  // Replace any remaining LaTeX backslashes or markers if any
  clean = clean.replace(/\\/g, "");
  return clean.trim();
}

export const PrintableReceipt = forwardRef<HTMLDivElement, PrintableReceiptProps>(
  ({ pedido, config }, ref) => {
    if (!pedido) return null;

    const saldo = pedido.valorTotal - pedido.valorPago;
    const dataEmissao = new Date().toLocaleDateString("pt-BR");

    const uniqueMaterials = pedido.material
      ? ([...new Set(pedido.material.split(",").map((m: string) => m.trim()))] as string[])
          .filter(Boolean)
          .map((m: string) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
          .join(", ")
      : "";

    const obsText = pedido.observacoes || "";
    let cleanObs = "";
    let orderItems: any[] = [];
    if (obsText.includes("===JSON_ITENS===")) {
      try {
        const parts = obsText.split("===JSON_ITENS===\n");
        cleanObs = parts[0].replace(/\n*Itens do Pedido:\n[\s\S]*$/, "").trim();
        const jsonPart = parts[1].split("\n===END_JSON_ITENS===")[0];
        orderItems = JSON.parse(jsonPart);
      } catch (e) {
        cleanObs = obsText.split("===JSON_ITENS===")[0].trim();
      }
    } else {
      cleanObs = obsText;
    }

    const finalItems = useMemo(() => {
      if (orderItems && orderItems.length > 0) {
        return orderItems;
      }
      return [
        {
          descricao: pedido.produto || "Item de Marcenaria",
          material: uniqueMaterials || pedido.material || "Não informado",
          medidas: cleanLatexMedidas(pedido.medidas || ""),
          quantidade: 1,
          valor: pedido.valorTotal || 0,
        },
      ];
    }, [orderItems, pedido, uniqueMaterials]);

    return (
      <div
        ref={ref}
        className="w-full max-w-[800px] p-8 md:p-12 bg-white text-slate-800 font-sans shadow-none"
        style={{ contentVisibility: "auto" }}
      >
        {/* CABEÇALHO */}
        <div className="flex flex-row justify-between items-center gap-4 pb-6 border-b-2 border-slate-200">
          <div className="flex items-center gap-4">
            {config?.logo_url ? (
              <div className="h-16 w-16 rounded-xl border bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={config.logo_url}
                  alt="Logo Marcenaria"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-xl bg-slate-900 text-white shrink-0 flex items-center justify-center font-bold text-xl">
                M
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {config?.nome_marcenaria || "Sua bancada"}
              </h1>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
                Gestão de Marcenaria
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-1">
            {config?.endereco && <p className="max-w-[250px] leading-tight text-slate-500">{config.endereco}</p>}
            {config?.telefone && <p className="font-semibold text-slate-800">WhatsApp: {config.telefone}</p>}
          </div>
        </div>

        {/* TÍTULO DO DOCUMENTO */}
        <div className="mt-8 flex justify-between items-end border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-primary uppercase">
              Documento de Pedido
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              ORÇAMENTO / RECIBO {pedido.numero}
            </h2>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>
              Data de Emissão: <span className="font-semibold text-slate-800">{dataEmissao}</span>
            </p>
          </div>
        </div>

        {/* DADOS DO CLIENTE */}
        <div className="mt-8 break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
            Dados do Cliente
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-950 w-1/3">Nome do Cliente</td>
                  <td className="py-3 px-4 text-slate-800">{pedido.cliente}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-500">Telefone / Celular</td>
                  <td className="py-3 px-4 text-slate-800">{pedido.telefone || "Não informado"}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-500">Endereço de Entrega</td>
                  <td className="py-3 px-4 text-slate-800">{pedido.clienteEndereco || "Não informado"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ITENS DO PEDIDO */}
        <div className="mt-8 break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
            Itens do Pedido
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                  <th className="py-2.5 px-4 text-left w-12">#</th>
                  <th className="py-2.5 px-4 text-left">Móvel / Projeto</th>
                  <th className="py-2.5 px-4 text-left">Material</th>
                  <th className="py-2.5 px-4 text-left">Medidas</th>
                  <th className="py-2.5 px-4 text-center w-12">Qtd</th>
                  <th className="py-2.5 px-4 text-right w-24">Valor Unit.</th>
                  <th className="py-2.5 px-4 text-right w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finalItems.map((item: any, index: number) => {
                  const cleanMed = cleanLatexMedidas(item.medidas || "");
                  const cleanMat = item.material || "—";
                  const cleanDesc = item.descricao || "";
                  const qtd = Number(item.quantidade || 1);
                  const valUnit = Number(item.valor || 0);
                  const subtotal = qtd * valUnit;

                  return (
                    <tr key={index} className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <td className="py-3 px-4 text-slate-400 font-medium">{index + 1}</td>
                      <td className="py-3 px-4 text-slate-900 font-semibold">{cleanDesc}</td>
                      <td className="py-3 px-4 text-slate-600">{cleanMat}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs">{cleanMed || "—"}</td>
                      <td className="py-3 px-4 text-center text-slate-800">{qtd}</td>
                      <td className="py-3 px-4 text-right text-slate-800 tabular-nums">{moeda(valUnit)}</td>
                      <td className="py-3 px-4 text-right text-slate-900 font-semibold tabular-nums">{moeda(subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* OBSERVAÇÕES */}
        {cleanObs && (
          <div className="mt-8 break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
              Observações
            </h3>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {cleanObs}
            </div>
          </div>
        )}

        {/* DETALHES FINANCEIROS */}
        <div className="mt-12 bg-slate-950 text-white rounded-2xl p-6 grid grid-cols-3 gap-4 text-center break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="border-r border-slate-800 flex flex-col justify-center items-center">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Valor Total
            </p>
            <p className="text-lg font-bold mt-1 text-white">{moeda(pedido.valorTotal)}</p>
          </div>
          <div className="border-r border-slate-800 flex flex-col justify-center items-center">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Valor Pago
            </p>
            <p className="text-lg font-bold mt-1 text-emerald-400">{moeda(pedido.valorPago)}</p>
          </div>
          <div className="flex flex-col justify-center items-center">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Saldo Devedor
            </p>
            <p
              className={`text-lg font-bold mt-1 ${
                saldo > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {moeda(saldo)}
            </p>
          </div>
        </div>

        {/* RODAPÉ */}
        <div
          className="mt-16 text-sm text-slate-600 break-inside-avoid space-y-12"
          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
        >
          <div className="text-sm font-medium text-slate-700">
            Maceió - AL, _____ de __________________ de 20___
          </div>

          <div className="grid grid-cols-2 gap-12 pt-8">
            <div className="flex flex-col items-center justify-end">
              <div className="w-full border-b border-slate-300 mb-2"></div>
              <span className="text-xs text-slate-800 uppercase font-bold tracking-wider text-center">
                {pedido.cliente}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Assinatura do Cliente</span>
            </div>
            <div className="flex flex-col items-center justify-end">
              <div className="w-full border-b border-slate-300 mb-2"></div>
              <span className="text-xs text-slate-800 uppercase font-bold tracking-wider text-center">
                {config?.nome_marcenaria || "Marcenaria"}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Assinatura do Responsável</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PrintableReceipt.displayName = "PrintableReceipt";
