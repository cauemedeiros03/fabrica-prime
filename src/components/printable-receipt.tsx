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

    return (
      <div
        ref={ref}
        className="w-full max-w-[800px] p-8 md:p-12 bg-white text-slate-800 font-sans shadow-none"
        style={{ contentVisibility: "auto" }}
      >
        {/* CABEÇALHO */}
        <div className="flex flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-200">
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
          <div className="text-right text-xs text-slate-500 space-y-0.5">
            {config?.endereco && <p className="max-w-[250px] leading-tight">{config.endereco}</p>}
            {config?.telefone && <p className="font-medium text-slate-800">WhatsApp: {config.telefone}</p>}
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
        <div className="mt-8">
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
            Dados do Cliente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium">Nome</p>
              <p className="font-semibold text-slate-900 mt-0.5">{pedido.cliente}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Telefone / Celular</p>
              <p className="font-medium text-slate-800 mt-0.5">{pedido.telefone || "Não informado"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-400 font-medium">Endereço de Entrega</p>
              <p className="text-slate-700 mt-0.5">{pedido.clienteEndereco || "Não informado"}</p>
            </div>
          </div>
        </div>

        {/* DETALHES DO PEDIDO */}
        <div className="mt-8">
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
            Especificações do Projeto
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                  <th className="py-2.5 px-4 text-left w-1/3">Item / Atributo</th>
                  <th className="py-2.5 px-4 text-left">Especificação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-950">Móvel / Projeto</td>
                  <td className="py-3 px-4 text-slate-800">{pedido.produto}</td>
                </tr>
                {pedido.tipo && (
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-500">Tipo</td>
                    <td className="py-3 px-4 text-slate-800">{pedido.tipo}</td>
                  </tr>
                )}
                {uniqueMaterials && (
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-500">Material</td>
                    <td className="py-3 px-4 text-slate-800">{uniqueMaterials}</td>
                  </tr>
                )}
                {pedido.cor && (
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-500">Cor / Acabamento</td>
                    <td className="py-3 px-4 text-slate-800">{pedido.cor}</td>
                  </tr>
                )}
                {pedido.observacoes && (
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-500">Observações</td>
                    <td className="py-3 px-4 text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {formatObservacoes(pedido.observacoes)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETALHES FINANCEIROS */}
        <div className="mt-8 bg-slate-950 text-white rounded-2xl p-6 grid grid-cols-3 gap-4 text-center">
          <div className="border-r border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Valor Total
            </p>
            <p className="text-lg font-bold mt-1 text-white">{moeda(pedido.valorTotal)}</p>
          </div>
          <div className="border-r border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Valor Pago
            </p>
            <p className="text-lg font-bold mt-1 text-emerald-400">{moeda(pedido.valorPago)}</p>
          </div>
          <div>
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
        <div className="mt-16 text-sm text-slate-500">
          <p className="text-xs">
            Local e Data: ___________________________________, _____ de _________________ de 20___
          </p>

          <div className="mt-16 grid grid-cols-2 gap-12">
            <div className="flex flex-col items-center">
              <div className="w-full border-b border-slate-300 mb-2"></div>
              <span className="text-xs text-slate-700 uppercase font-bold tracking-wider">
                {pedido.cliente}
              </span>
              <span className="text-[10px] text-slate-400 uppercase">Assinatura do Cliente</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full border-b border-slate-300 mb-2"></div>
              <span className="text-xs text-slate-700 uppercase font-bold tracking-wider">
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
