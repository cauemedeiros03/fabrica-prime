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
        className="w-full max-w-[800px] p-6 print:p-4 md:p-8 bg-white text-slate-800 font-sans shadow-none print:text-[10.5px] print:leading-tight"
        style={{ contentVisibility: "auto" }}
      >
        {/* CABEÇALHO */}
        <div className="flex flex-row justify-between items-start gap-4 pb-4 border-b-2 border-slate-200 print:pb-1.5">
          <div className="flex items-center gap-4">
            {config?.logo_url ? (
              <div className="h-16 w-16 print:h-9 print:w-9 print:rounded-lg border bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={config.logo_url}
                  alt="Logo Marcenaria"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-16 w-16 print:h-9 print:w-9 print:rounded-lg bg-slate-900 text-white shrink-0 flex items-center justify-center font-bold text-xl print:text-sm">
                M
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 print:text-sm">
                {config?.nome_marcenaria || "Sua bancada"}
              </h1>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider print:text-[9px]">
                Gestão de Marcenaria
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-0.5 print:text-[9.5px]">
            {config?.endereco && <p className="max-w-[250px] leading-tight">{config.endereco}</p>}
            {config?.telefone && <p className="font-medium text-slate-800">WhatsApp: {config.telefone}</p>}
          </div>
        </div>

        {/* TÍTULO DO DOCUMENTO */}
        <div className="mt-4 print:mt-1.5 flex justify-between items-end border-b border-slate-100 pb-2 print:pb-0.5">
          <div>
            <span className="text-xs font-semibold tracking-wider text-primary uppercase print:text-[9px]">
              Documento de Pedido
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight print:text-sm">
              ORÇAMENTO / RECIBO {pedido.numero}
            </h2>
          </div>
          <div className="text-right text-xs text-slate-500 print:text-[9.5px]">
            <p>
              Data de Emissão: <span className="font-semibold text-slate-800">{dataEmissao}</span>
            </p>
          </div>
        </div>

        {/* DADOS DO CLIENTE */}
        <div className="mt-4 print:mt-1.5 break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5 print:mb-0.5">
            Dados do Cliente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:gap-1 bg-slate-50 p-3 print:p-1.5 rounded-lg border border-slate-100 text-xs print:text-[9.5px]">
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Nome</p>
              <p className="font-semibold text-slate-900 mt-0.5">{pedido.cliente}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Telefone / Celular</p>
              <p className="font-medium text-slate-800 mt-0.5">{pedido.telefone || "Não informado"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-[10px] text-slate-400 font-medium">Endereço de Entrega</p>
              <p className="text-slate-700 mt-0.5">{pedido.clienteEndereco || "Não informado"}</p>
            </div>
          </div>
        </div>

        {/* DETALHES DO PEDIDO */}
        <div className="mt-4 print:mt-1.5">
          <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5 print:mb-0.5 break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            Especificações do Projeto
          </h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-semibold uppercase break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <th className="py-2 px-3 text-left w-1/3 print:py-0.5 print:px-1.5">Item / Atributo</th>
                  <th className="py-2 px-3 text-left print:py-0.5 print:px-1.5">Especificação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <td className="py-2 px-3 font-semibold text-slate-950 print:py-0.5 print:px-1.5">Móvel / Projeto</td>
                  <td className="py-2 px-3 text-slate-800 print:py-0.5 print:px-1.5">{pedido.produto}</td>
                </tr>
                {pedido.tipo && (
                  <tr className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td className="py-2 px-3 font-medium text-slate-500 print:py-0.5 print:px-1.5">Tipo</td>
                    <td className="py-2 px-3 text-slate-800 print:py-0.5 print:px-1.5">{pedido.tipo}</td>
                  </tr>
                )}
                {uniqueMaterials && (
                  <tr className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td className="py-2 px-3 font-medium text-slate-500 print:py-0.5 print:px-1.5">Material</td>
                    <td className="py-2 px-3 text-slate-800 print:py-0.5 print:px-1.5">{uniqueMaterials}</td>
                  </tr>
                )}
                {pedido.cor && (
                  <tr className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td className="py-2 px-3 font-medium text-slate-500 print:py-0.5 print:px-1.5">Cor / Acabamento</td>
                    <td className="py-2 px-3 text-slate-800 print:py-0.5 print:px-1.5">{pedido.cor}</td>
                  </tr>
                )}
                {pedido.observacoes && (
                  <tr className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td className="py-2 px-3 font-medium text-slate-500 print:py-0.5 print:px-1.5">Observações</td>
                    <td className="py-2 px-3 text-slate-700 text-xs print:py-0.5 print:px-1.5">
                      {cleanObs && <div className="whitespace-pre-wrap leading-tight mb-2 print:mb-1 print:text-[10px]">{cleanObs}</div>}
                      {orderItems.length > 0 && (
                        <div className="border-t border-dashed border-slate-200 pt-1.5 mt-1.5 print:pt-1 print:mt-1">
                          <p className="font-semibold text-slate-900 text-[11px] mb-1 print:text-[10px]">Itens do Pedido:</p>
                          <ul className="list-none space-y-0.5 text-[11px] print:text-[9px] print:leading-none">
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
                                <li key={index} className="text-slate-700">
                                  {index + 1}. {item.descricao}{matPart}{medPart}{valPart}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      {!cleanObs && orderItems.length === 0 && (
                        <div className="whitespace-pre-wrap leading-tight">{formatObservacoes(pedido.observacoes)}</div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETALHES FINANCEIROS */}
        <div className="mt-4 bg-slate-950 text-white rounded-xl p-4 grid grid-cols-3 gap-4 text-center break-inside-avoid print:mt-1.5 print:py-1.5 print:px-2 print:gap-2">
          <div className="border-r border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Valor Total
            </p>
            <p className="text-base font-bold mt-1 text-white print:text-xs print:mt-0">{moeda(pedido.valorTotal)}</p>
          </div>
          <div className="border-r border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Valor Pago
            </p>
            <p className="text-base font-bold mt-1 text-emerald-400 print:text-xs print:mt-0">{moeda(pedido.valorPago)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Saldo Devedor
            </p>
            <p
              className={`text-base font-bold mt-1 print:text-xs print:mt-0 ${
                saldo > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {moeda(saldo)}
            </p>
          </div>
        </div>

        {/* RODAPÉ */}
        <div
          className="mt-10 text-xs text-slate-500 break-inside-avoid print:mt-4"
          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
        >
          <p className="text-[11px] print:text-[10px]">
            Local e Data: ___________________________________, _____ de _________________ de 20___
          </p>

          <div className="mt-10 grid grid-cols-2 gap-12 print:mt-4 print:gap-8">
            <div className="flex flex-col items-center">
              <div className="w-full border-b border-slate-300 mb-2 print:mb-0.5"></div>
              <span className="text-xs text-slate-700 uppercase font-bold tracking-wider text-center print:text-[9.5px]">
                {pedido.cliente}
              </span>
              <span className="text-[9px] text-slate-400 uppercase print:text-[8px]">Assinatura do Cliente</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full border-b border-slate-300 mb-2 print:mb-0.5"></div>
              <span className="text-xs text-slate-700 uppercase font-bold tracking-wider text-center print:text-[9.5px]">
                {config?.nome_marcenaria || "Marcenaria"}
              </span>
              <span className="text-[9px] text-slate-400 uppercase print:text-[8px]">Assinatura do Responsável</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PrintableReceipt.displayName = "PrintableReceipt";
