import { toast } from "sonner";
import { ETAPAS, moeda } from "./mock-data";
import { formatObservacoes } from "./utils";

export function sendWhatsAppMessage(pedido: any) {
  if (!pedido.telefone) {
    toast.error("Cliente sem telefone cadastrado");
    return;
  }
  const phone = pedido.telefone.replace(/\D/g, '');
  const etapaLabel = ETAPAS.find(e => e.id === pedido.etapa)?.label || pedido.etapa;
  const saldo = pedido.valorTotal - pedido.valorPago;
  
  const obsClean = formatObservacoes(pedido.observacoes);
  const obsPart = obsClean ? `\n\n*Detalhes do Pedido:*\n${obsClean}` : "";
  
  let msg = "";
  if (pedido.etapa === "pronto-entrega") {
    msg = `Olá! Ótima notícia: seu pedido ${pedido.produto} está Pronto para entrega! O saldo restante para a liberação é de ${moeda(saldo)}. Vamos agendar o envio?${obsPart}`;
  } else {
    msg = `Olá! Passando para avisar que a produção do seu pedido ${pedido.produto} avançou e agora ele está na etapa: ${etapaLabel}! Tudo correndo super bem por aqui.${obsPart}`;
  }
  
  window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}
