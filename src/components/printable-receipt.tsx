import { forwardRef } from "react";
import { moeda } from "@/lib/mock-data";
import { formatObservacoes } from "@/lib/utils";

interface PrintableReceiptProps {
  pedido: any;
  config: any;
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

        {/* DETALHES DO PEDIDO */}
        <div className="mt-8">
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            Especificações do Projeto
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <th className="py-2.5 px-4 text-left w-1/3">Item / Atributo</th>
                  <th className="py-2.5 px-4 text-left">Especificação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <td className="py-3 px-4 font-semibold text-slate-950">Móvel / Projeto</td>
                  <td className="py-3 px-4 text-slate-800">{pedido.produto}</td>
                </tr>
                {pedido.tipo && (
                  <tr className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td className="py-3 px-4 font-medium text-slate-500">Tipo</td>
                    <td className="py-3 px-4 text-slate-800">{pedido.tipo}</td>
                  </tr>
                )}
                {uniqueMaterials && (
                  <tr className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td className="py-3 px-4 font-medium text-slate-500">Material</td>
                    <td className="py-3 px-4 text-slate-800">{uniqueMaterials}</td>
                  </tr>
                )}
                {pedido.cor && (
                  <tr className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td className="py-3 px-4 font-medium text-slate-500">Cor / Acabamento</td>
                    <td className="py-3 px-4 text-slate-800">{pedido.cor}</td>
                  </tr>
                )}
                {pedido.observacoes && (
                  <tr className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td className="py-3 px-4 font-medium text-slate-500">Observações</td>
                    <td className="py-3 px-4 text-slate-700 text-sm">
                      {cleanObs && <div className="whitespace-pre-wrap leading-relaxed mb-4">{cleanObs}</div>}
                      {orderItems.length > 0 && (
                        <div className="border-t border-dashed border-slate-200 pt-3 mt-3">
                          <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2">Itens do Pedido:</p>
                          <ul className="list-none pl-4 space-y-2 text-slate-700 text-sm leading-relaxed">
                            {orderItems.map((item: any, index: number) => {
                              const matPart = item.material ? ` (${item.material})` : "";
                              const medPart = item.medidas ? ` - Medidas: ${item.medidas}` : "";
                              let valPart = "";
                              if (item.valor && Number(item.valor) > 0) {
                                const valFormatted = Number(item.valor).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                });
                                valPart = ` - R$ ${valFormatted}`;
                              }
                              return (
                                <li key={index} className="flex justify-between items-start border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                                  <span>{index + 1}. {item.descricao}{matPart}{medPart}</span>
                                  {valPart && <span className="font-semibold text-slate-900 tabular-nums shrink-0">{valPart}</span>}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      {!cleanObs && orderItems.length === 0 && (
                        <div className="whitespace-pre-wrap leading-relaxed">{formatObservacoes(pedido.observacoes)}</div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

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
          className="mt-16 text-sm text-slate-500 break-inside-avoid"
          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
        >
          <p className="text-xs">
            Local e Data: ___________________________________, _____ de _________________ de 20___
          </p>

          <div className="mt-16 grid grid-cols-2 gap-12">
            <div className="flex flex-col items-center justify-end h-full">
              <div className="w-full border-b border-slate-300 mb-2"></div>
              <span className="text-xs text-slate-700 uppercase font-bold tracking-wider text-center">
                {pedido.cliente}
              </span>
              <span className="text-[10px] text-slate-400 uppercase">Assinatura do Cliente</span>
            </div>
            <div className="flex flex-col items-center justify-end h-full">
              <div className="w-full border-b border-slate-300 mb-2"></div>
              <span className="text-xs text-slate-700 uppercase font-bold tracking-wider text-center">
                {config?.nome_marcenaria || "Marcenaria"}
              </span>
              <span className="text-[10px] text-slate-400 uppercase">Assinatura do Responsável</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PrintableReceipt.displayName = "PrintableReceipt";
