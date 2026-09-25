import React from "react";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Printer,
  User,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Orcamento } from "@/components/orcamento-dialog";

type OrcamentoComItens = Orcamento & {
  itens?: any[];
};

type OrcamentoViewerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: OrcamentoComItens | null;

  onEdit?: (orcamento: OrcamentoComItens) => void;
  onPrint?: (orcamento: OrcamentoComItens) => void;
  onWhatsApp?: (orcamento: OrcamentoComItens) => void;
  onApprove?: (orcamento: OrcamentoComItens) => void;
};

function numero(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function moeda(valor: unknown): string {
  return numero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(valor: unknown): string {
  if (!valor) return "—";

  const data = new Date(String(valor));

  if (Number.isNaN(data.getTime())) {
    return String(valor);
  }

  return data.toLocaleDateString("pt-BR");
}

function quantidadeItem(item: any): number {
  const quantidade = numero(
    item?.quantidade ??
      item?.qtd ??
      item?.quantity ??
      item?.quantidade_item ??
      1
  );

  return quantidade > 0 ? quantidade : 1;
}

function precoUnitarioItem(item: any): number {
  return numero(
    item?.preco_unitario ??
      item?.precoUnitario ??
      item?.preco ??
      item?.valor_unitario ??
      item?.valorUnitario ??
      item?.valor ??
      0
  );
}

function nomeItem(item: any): string {
  return (
    item?.nome ??
    item?.produto ??
    item?.produtoNome ??
    item?.produto_nome ??
    item?.descricao ??
    item?.produtoDescricao ??
    "Produto"
  );
}

function materialItem(item: any): string {
  return (
    item?.material ??
    item?.materialNome ??
    item?.material_nome ??
    ""
  );
}

function medidasItem(item: any): string {
  return (
    item?.medidas ??
    item?.dimensoes ??
    item?.dimensao ??
    item?.tamanho ??
    ""
  );
}

function acabamentoItem(item: any): string {
  return (
    item?.cor ??
    item?.acabamento ??
    item?.cor_acabamento ??
    ""
  );
}

export function OrcamentoViewerDialog({
  open,
  onOpenChange,
  orcamento,
  onEdit,
  onPrint,
  onWhatsApp,
  onApprove,
}: OrcamentoViewerDialogProps) {
  if (!orcamento) {
    return null;
  }

  const itens = Array.isArray(orcamento.itens) ? orcamento.itens : [];

  const valorBruto = numero(orcamento.valorSugerido);
  const desconto = Math.max(0, numero(orcamento.desconto));
  const valorFinal = Math.max(0, valorBruto - desconto);

  const status = String(orcamento.status || "Pendente");

  const aprovado =
    status.toLowerCase() === "aprovado" ||
    status.toLowerCase() === "aprovada";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-full
          h-full
          md:h-auto
          md:max-h-[90vh]
          md:max-w-3xl
          md:rounded-2xl
          bg-card
          border
          shadow-[var(--shadow-elevated)]
          p-0
          gap-0
          overflow-hidden
          flex
          flex-col
        "
      >
        {/* CABEÇALHO */}
        <DialogHeader className="px-5 md:px-6 py-4 border-b shrink-0">
          <div className="flex items-start gap-3 pr-8">
            <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <FileText className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg md:text-xl font-semibold tracking-tight">
                Orçamento
              </DialogTitle>

              <DialogDescription className="mt-1 text-sm">
                Visualização completa da proposta comercial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 md:p-6 space-y-5">
            {/* CLIENTE */}
            <section className="rounded-xl border bg-muted/20 overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <User className="size-4 text-primary" />

                <h3 className="text-sm font-semibold">
                  Dados do cliente
                </h3>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    Nome
                  </p>

                  <p className="font-medium break-words">
                    {orcamento.clienteNome || "Cliente sem nome"}
                  </p>
                </div>

                {orcamento.clienteTelefone && (
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Phone className="size-3.5" />
                      Telefone
                    </p>

                    <p className="font-medium break-words">
                      {orcamento.clienteTelefone}
                    </p>
                  </div>
                )}

                {orcamento.clienteEmail && (
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Mail className="size-3.5" />
                      E-mail
                    </p>

                    <p className="font-medium break-words">
                      {orcamento.clienteEmail}
                    </p>
                  </div>
                )}

                {orcamento.clienteCpfCnpj && (
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">
                      CPF / CNPJ
                    </p>

                    <p className="font-medium break-words">
                      {orcamento.clienteCpfCnpj}
                    </p>
                  </div>
                )}

                {orcamento.clienteCidade && (
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      Cidade
                    </p>

                    <p className="font-medium break-words">
                      {orcamento.clienteCidade}
                    </p>
                  </div>
                )}

                {orcamento.clienteEndereco && (
                  <div className="min-w-0 md:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      Endereço
                    </p>

                    <p className="font-medium break-words">
                      {orcamento.clienteEndereco}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* STATUS / DATA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border p-4 bg-card">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <CalendarDays className="size-4" />

                  <span className="text-xs font-medium">
                    Data do orçamento
                  </span>
                </div>

                <p className="font-semibold">
                  {dataBR(orcamento.criadoEm)}
                </p>
              </div>

              <div className="rounded-xl border p-4 bg-card">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  {aprovado ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <FileText className="size-4" />
                  )}

                  <span className="text-xs font-medium">
                    Status
                  </span>
                </div>

                <p className="font-semibold">
                  {status}
                </p>
              </div>

              <div className="rounded-xl border p-4 bg-card">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <CalendarDays className="size-4" />

                  <span className="text-xs font-medium">
                    Validade
                  </span>
                </div>

                <p className="font-semibold">
                  {numero(orcamento.validadeDias) || 15} dias
                </p>
              </div>
            </div>

            {/* PRODUTOS */}
            <section className="rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <Package className="size-4 text-primary" />

                <h3 className="text-sm font-semibold">
                  Produtos do orçamento
                </h3>
              </div>

              {itens.length > 0 ? (
                <div className="divide-y">
                  {itens.map((item, index) => {
                    const quantidade = quantidadeItem(item);
                    const precoUnitario = precoUnitarioItem(item);
                    const totalItem = quantidade * precoUnitario;

                    const material = materialItem(item);
                    const medidas = medidasItem(item);
                    const acabamento = acabamentoItem(item);

                    return (
                      <div
                        key={item?.id ?? `${nomeItem(item)}-${index}`}
                        className="p-4"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-3">
                              <div className="size-9 rounded-lg bg-muted grid place-items-center shrink-0">
                                <Package className="size-4 text-muted-foreground" />
                              </div>

                              <div className="min-w-0">
                                <h4 className="font-semibold break-words">
                                  {nomeItem(item)}
                                </h4>

                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                  {material && (
                                    <span>
                                      Material: {material}
                                    </span>
                                  )}

                                  {acabamento && (
                                    <span>
                                      Acabamento: {acabamento}
                                    </span>
                                  )}

                                  {medidas && (
                                    <span>
                                      Medidas: {medidas}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="md:text-right shrink-0">
                            <p className="text-xs text-muted-foreground">
                              {quantidade} × {moeda(precoUnitario)}
                            </p>

                            <p className="font-semibold mt-1">
                              {moeda(totalItem)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4">
                  <div className="rounded-lg bg-muted/30 p-4">
                    <p className="text-sm font-medium">
                      {orcamento.produtoDescricao ||
                        "Nenhum produto informado."}
                    </p>

                    {orcamento.produtoMaterial && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Material: {orcamento.produtoMaterial}
                      </p>
                    )}

                    {orcamento.produtoMedidas && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Medidas: {orcamento.produtoMedidas}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* OBSERVAÇÕES */}
            {orcamento.observacoes && (
              <section className="rounded-xl border bg-muted/20 overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <FileText className="size-4 text-primary" />

                  <h3 className="text-sm font-semibold">
                    Observações
                  </h3>
                </div>

                <div className="p-4">
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {orcamento.observacoes}
                  </p>
                </div>
              </section>
            )}

            {/* CONDIÇÕES */}
            <section className="rounded-xl border bg-muted/20 overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />

                <h3 className="text-sm font-semibold">
                  Condições comerciais
                </h3>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Forma de pagamento
                  </p>

                  <p className="font-medium">
                    {orcamento.formaPagamento || "Não informado"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Validade da proposta
                  </p>

                  <p className="font-medium">
                    {numero(orcamento.validadeDias) || 15} dias
                  </p>
                </div>
              </div>
            </section>

            {/* VALORES */}
            <section className="rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-semibold">
                  Resumo financeiro
                </h3>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Valor dos produtos
                  </span>

                  <span className="font-medium">
                    {moeda(valorBruto)}
                  </span>
                </div>

                {desconto > 0 && (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Desconto
                    </span>

                    <span className="font-medium">
                      - {moeda(desconto)}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t flex items-center justify-between gap-4">
                  <span className="font-semibold">
                    Valor final
                  </span>

                  <span className="text-xl font-bold">
                    {moeda(valorFinal)}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* AÇÕES */}
        <div className="shrink-0 border-t bg-card px-4 md:px-6 py-3">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="
                h-10
                px-4
                rounded-lg
                border
                bg-background
                hover:bg-accent
                transition-colors
                text-sm
                font-medium
                inline-flex
                items-center
                justify-center
                gap-2
              "
            >
              <X className="size-4" />
              Fechar
            </button>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(orcamento)}
                  className="
                    h-10
                    px-4
                    rounded-lg
                    border
                    bg-background
                    hover:bg-accent
                    transition-colors
                    text-sm
                    font-medium
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  <Pencil className="size-4" />
                  Editar
                </button>
              )}

              {onPrint && (
                <button
                  type="button"
                  onClick={() => onPrint(orcamento)}
                  className="
                    h-10
                    px-4
                    rounded-lg
                    border
                    bg-background
                    hover:bg-accent
                    transition-colors
                    text-sm
                    font-medium
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  <Printer className="size-4" />
                  Imprimir
                </button>
              )}

              {onWhatsApp && (
                <button
                  type="button"
                  onClick={() => onWhatsApp(orcamento)}
                  className="
                    h-10
                    px-4
                    rounded-lg
                    bg-primary
                    text-primary-foreground
                    hover:bg-primary/90
                    transition-colors
                    text-sm
                    font-medium
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </button>
              )}

              {!aprovado && onApprove && (
                <button
                  type="button"
                  onClick={() => onApprove(orcamento)}
                  className="
                    h-10
                    px-4
                    rounded-lg
                    bg-primary
                    text-primary-foreground
                    hover:bg-primary/90
                    transition-colors
                    text-sm
                    font-medium
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  <CheckCircle2 className="size-4" />
                  Aprovar / Criar pedido
                </button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OrcamentoViewerDialog;