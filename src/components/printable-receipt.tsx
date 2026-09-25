import { forwardRef, useMemo } from "react";
import { moeda } from "@/lib/mock-data";

interface PrintableReceiptProps {
  pedido: any;
  config: any;
}

function cleanLatexMedidas(medidas: string): string {
  if (!medidas) return "";

  let clean = medidas.replace(/\$/g, "");
  clean = clean.replace(/\\times/gi, " x ");
  clean = clean.replace(/\s+/g, " ");
  clean = clean.replace(/\\/g, "");

  return clean.trim();
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "Não informado";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Não informado";
  }

  return parsed.toLocaleDateString("pt-BR");
}

function formatAddress(pedido: any): string {
  const parts = [
    pedido.endereco,
    pedido.numero_endereco ? `Nº ${pedido.numero_endereco}` : "",
    pedido.complemento,
    pedido.bairro,
    pedido.cidade,
    pedido.cep ? `CEP ${pedido.cep}` : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Não informado";
}

function formatEtapa(etapa: string | null | undefined): string {
  if (!etapa) return "Não informado";

  const labels: Record<string, string> = {
    "pedido-recebido": "Pedido recebido",
    "em-producao": "Em produção",
    "producao": "Em produção",
    "aguardando-material": "Aguardando material",
    "acabamento": "Acabamento",
    "pronto": "Pronto",
    "entregue": "Entregue",
    "cancelado": "Cancelado",
  };

  return labels[etapa] || etapa;
}

function formatPrioridade(
  prioridade: string | null | undefined
): string {
  if (!prioridade) return "Não informado";

  const labels: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    urgente: "Urgente",
  };

  return labels[prioridade] || prioridade;
}

export const PrintableReceipt = forwardRef<
  HTMLDivElement,
  PrintableReceiptProps
>(({ pedido, config }, ref) => {
  if (!pedido) return null;

  const valorTotal = Number(pedido.valorTotal ?? pedido.valor_total ?? 0);
  const valorPago = Number(pedido.valorPago ?? pedido.valor_pago ?? 0);
  const desconto = Number(pedido.desconto ?? 0);
  const saldo = valorTotal - valorPago;

  const dataEmissao =
    pedido.data_criacao ||
    pedido.criadoEm ||
    pedido.created_at ||
    new Date().toISOString();

  const dataEntrega =
    pedido.data_entrega_estimada || pedido.entrega || null;

  const uniqueMaterials = pedido.material
    ? ([...new Set(
        String(pedido.material)
          .split(",")
          .map((m: string) => m.trim())
      )] as string[])
        .filter(Boolean)
        .map(
          (m: string) =>
            m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()
        )
        .join(", ")
    : "";

  const obsText = pedido.observacoes || "";

  let cleanObs = "";
  let orderItems: any[] = [];

  if (obsText.includes("===JSON_ITENS===")) {
    try {
      const parts = obsText.split("===JSON_ITENS===\n");

      cleanObs = parts[0]
        .replace(/\n*Itens do Pedido:\n[\s\S]*$/, "")
        .trim();

      if (parts[1]) {
        const jsonPart =
          parts[1].split("\n===END_JSON_ITENS===")[0];

        orderItems = JSON.parse(jsonPart);
      }
    } catch {
      cleanObs = obsText
        .split("===JSON_ITENS===")[0]
        .trim();
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
        material:
          uniqueMaterials ||
          pedido.material ||
          "Não informado",
        medidas: cleanLatexMedidas(pedido.medidas || ""),
        quantidade: 1,
        valor: valorTotal,
      },
    ];
  }, [orderItems, pedido, uniqueMaterials, valorTotal]);

  return (
    <div
      ref={ref}
      className="w-full max-w-[800px] p-8 md:p-12 bg-white text-slate-800 font-sans shadow-none"
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
          {config?.endereco && (
            <p className="max-w-[250px] leading-tight text-slate-500">
              {config.endereco}
            </p>
          )}

          {config?.telefone && (
            <p className="font-semibold text-slate-800">
              WhatsApp: {config.telefone}
            </p>
          )}
        </div>
      </div>

      {/* TÍTULO DO DOCUMENTO */}
      <div className="mt-8 flex justify-between items-end border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-semibold tracking-wider text-primary uppercase">
            Documento de Pedido
          </span>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            PEDIDO {pedido.numero || ""}
          </h2>
        </div>

        <div className="text-right text-xs text-slate-500 space-y-1">
          <p>
            Data do Pedido:{" "}
            <span className="font-semibold text-slate-800">
              {formatDate(dataEmissao)}
            </span>
          </p>

          <p>
            Entrega Estimada:{" "}
            <span className="font-semibold text-slate-800">
              {formatDate(dataEntrega)}
            </span>
          </p>
        </div>
      </div>

      {/* STATUS DO PEDIDO */}
      <div
        className="mt-6 grid grid-cols-3 gap-3 break-inside-avoid"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Etapa
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatEtapa(pedido.etapa)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Prioridade
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatPrioridade(pedido.prioridade)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Origem
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {pedido.origem || "Não informado"}
          </p>
        </div>
      </div>

      {/* DADOS DO CLIENTE */}
      <div
        className="mt-8 break-inside-avoid"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
          Dados do Cliente
        </h3>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-950 w-1/3">
                  Nome do Cliente
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {pedido.cliente ||
                    pedido.cliente_nome ||
                    "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  CPF / CNPJ
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {pedido.cpf || "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Telefone / Celular
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {pedido.telefone || "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  E-mail
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {pedido.email || "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Endereço de Entrega
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {formatAddress(pedido)}
                </td>
              </tr>

              {pedido.instagram && (
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-500">
                    Instagram
                  </td>

                  <td className="py-3 px-4 text-slate-800">
                    {pedido.instagram}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INFORMAÇÕES DO PRODUTO */}
      <div
        className="mt-8 break-inside-avoid"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
          Informações do Pedido
        </h3>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-4 font-medium text-slate-500 w-1/3">
                  Produto / Projeto
                </td>

                <td className="py-3 px-4 font-semibold text-slate-900">
                  {pedido.produto || "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Tipo
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {pedido.tipo || "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Material
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {uniqueMaterials ||
                    pedido.material ||
                    "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Cor / Acabamento
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {pedido.cor || "Não informado"}
                </td>
              </tr>

              {pedido.medidas && (
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-500">
                    Medidas
                  </td>

                  <td className="py-3 px-4 text-slate-800 font-mono text-xs">
                    {cleanLatexMedidas(pedido.medidas)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ITENS DO PEDIDO */}
<div
  className="mt-8 break-inside-avoid"
  style={{
    pageBreakInside: "avoid",
    breakInside: "avoid",
  }}
>
  <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
    Itens do Pedido
  </h3>

  <div className="border border-slate-200 rounded-xl overflow-hidden">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
          <th className="py-2.5 px-3 text-left w-10">
            #
          </th>

          <th className="py-2.5 px-3 text-left">
            Móvel / Projeto
          </th>

          <th className="py-2.5 px-3 text-left">
            Material
          </th>

          <th className="py-2.5 px-3 text-left">
            Medidas
          </th>

          <th className="py-2.5 px-3 text-center w-12">
            Qtd
          </th>

          <th className="py-2.5 px-3 text-right w-24">
            Valor Unit.
          </th>

          <th className="py-2.5 px-3 text-right w-24">
            Subtotal
          </th>
        </tr>
      </thead>

      <tbody className="divide-y divide-slate-100">
        {finalItems.map((item: any, index: number) => {
          const cleanMed = cleanLatexMedidas(
            item.medidas || ""
          );

          const cleanMat =
            item.material || "—";

          const cleanDesc =
            item.descricao ||
            item.nome ||
            "Não informado";

          const productName =
            item.nome &&
            item.nome !== item.descricao
              ? item.nome
              : "";

          const specifications =
            item.especificacoes_customizadas ||
            "";

          const qtd = Math.max(
            1,
            Number(item.quantidade || 1)
          );

          const valUnit = Number(
            item.valor ??
              item.preco_unitario ??
              0
          );

          const subtotal = qtd * valUnit;

          return (
            <tr
              key={index}
              className="break-inside-avoid align-top"
              style={{
                pageBreakInside: "avoid",
                breakInside: "avoid",
              }}
            >
              <td className="py-3 px-3 text-slate-400 font-medium">
                {index + 1}
              </td>

              <td className="py-3 px-3">
                <div className="flex items-start gap-3">
                  {item.imagem_url ? (
                    <div className="w-14 h-14 shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                      <img
                        src={item.imagem_url}
                        alt={cleanDesc}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {cleanDesc}
                    </p>

                    {productName && (
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Produto do catálogo: {productName}
                      </p>
                    )}

                    {item.produto_id && (
                      <p className="mt-0.5 text-[9px] text-slate-400">
                        Código: {item.produto_id}
                      </p>
                    )}

                    {specifications && (
                      <div className="mt-2 rounded-md bg-slate-50 border border-slate-100 px-2 py-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          Especificações
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {specifications}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </td>

              <td className="py-3 px-3 text-slate-600">
                {cleanMat}
              </td>

              <td className="py-3 px-3 text-slate-600 font-mono text-xs">
                {cleanMed || "—"}
              </td>

              <td className="py-3 px-3 text-center text-slate-800">
                {qtd}
              </td>

              <td className="py-3 px-3 text-right text-slate-800 tabular-nums whitespace-nowrap">
                {moeda(valUnit)}
              </td>

              <td className="py-3 px-3 text-right text-slate-900 font-semibold tabular-nums whitespace-nowrap">
                {moeda(subtotal)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</div>

      {/* OBSERVAÇÕES */}
      {cleanObs && (
        <div
          className="mt-8 break-inside-avoid"
          style={{
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
            Observações
          </h3>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {cleanObs}
          </div>
        </div>
      )}

      {/* CONDIÇÕES DE PAGAMENTO */}
      <div
        className="mt-8 break-inside-avoid"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
          Condições de Pagamento
        </h3>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-4 font-medium text-slate-500 w-1/3">
                  Forma de Pagamento
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {pedido.forma_pagamento ||
                    "Não informado"}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-medium text-slate-500">
                  Desconto
                </td>

                <td className="py-3 px-4 text-slate-800">
                  {moeda(desconto)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* DETALHES FINANCEIROS */}
      <div
        className="mt-8 bg-slate-950 text-white rounded-2xl p-6 grid grid-cols-3 gap-4 text-center break-inside-avoid"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <div className="border-r border-slate-800 flex flex-col justify-center items-center">
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
            Valor Total
          </p>

          <p className="text-lg font-bold mt-1 text-white">
            {moeda(valorTotal)}
          </p>
        </div>

        <div className="border-r border-slate-800 flex flex-col justify-center items-center">
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
            Valor Pago
          </p>

          <p className="text-lg font-bold mt-1 text-emerald-400">
            {moeda(valorPago)}
          </p>
        </div>

        <div className="flex flex-col justify-center items-center">
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
            Saldo Devedor
          </p>

          <p
            className={`text-lg font-bold mt-1 ${
              saldo > 0
                ? "text-rose-400"
                : "text-emerald-400"
            }`}
          >
            {moeda(saldo)}
          </p>
        </div>
      </div>

      {/* LOCAL E DATA */}
      <div
        className="mt-12 text-sm font-medium text-slate-700 break-inside-avoid"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        Maceió - AL, _____ de __________________ de 20___
      </div>

      {/* ASSINATURAS */}
      <div
        className="mt-16 grid grid-cols-2 gap-12 break-inside-avoid pt-4"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <div className="flex flex-col items-center justify-end">
          <div className="w-full border-b border-slate-300 mb-2" />

          <span className="text-xs text-slate-800 uppercase font-bold tracking-wider text-center">
            {pedido.cliente ||
              pedido.cliente_nome ||
              "Cliente"}
          </span>

          <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
            Assinatura do Cliente
          </span>
        </div>

        <div className="flex flex-col items-center justify-end">
          <div className="w-full border-b border-slate-300 mb-2" />

          <span className="text-xs text-slate-800 uppercase font-bold tracking-wider text-center">
            {config?.nome_marcenaria || "Marcenaria"}
          </span>

          <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
            Assinatura do Responsável
          </span>
        </div>
      </div>
    </div>
  );
});

PrintableReceipt.displayName = "PrintableReceipt";