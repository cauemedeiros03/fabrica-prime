import type { Pedido } from "@/lib/mock-data";


export type Notif = {
  id: string;
  tipo: "novo" | "atrasado" | "pagamento" | "concluido" | "etapa";
  titulo: string;
  descricao: string;
  pedidoId?: string;
  data: string; // ISO
};

export function buildNotifications(pedidos: Pedido[]): Notif[] {
  const out: Notif[] = [];
  const agora = Date.now();
  const seteDias = 1000 * 60 * 60 * 24 * 7;

  for (const p of pedidos) {
    if (p.criadoEm && agora - +new Date(p.criadoEm) < seteDias) {
      out.push({
        id: `novo-${p.id}`,
        tipo: "novo",
        titulo: `Novo pedido ${p.numero}`,
        descricao: `${p.cliente} — ${p.produto}`,
        pedidoId: p.id,
        data: p.criadoEm,
      });
    }
    if (p.entrega && new Date(p.entrega) < new Date() && p.etapa !== "entregue") {
      out.push({
        id: `atrasado-${p.id}`,
        tipo: "atrasado",
        titulo: `Pedido atrasado ${p.numero}`,
        descricao: `${p.cliente} — entrega vencida`,
        pedidoId: p.id,
        data: p.entrega,
      });
    }
    if (p.etapa === "entregue") {
      out.push({
        id: `concluido-${p.id}`,
        tipo: "concluido",
        titulo: `Pedido concluído ${p.numero}`,
        descricao: `${p.cliente} — entregue`,
        pedidoId: p.id,
        data: p.entrega,
      });
    }
  }

  return out.sort((a, b) => +new Date(b.data) - +new Date(a.data)).slice(0, 30);
}

const KEY = "marcena.notif.read";
export function getReadIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return new Set();
  }
}
export function setReadIds(ids: Set<string>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify([...ids]));
}

/** IDs de notificações descartadas ("limpas") — não aparecem mais na lista */
const DISMISSED_KEY = "marcena.notif.dismissed";
export function getDismissedIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
export function setDismissedIds(ids: Set<string>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export function tempo(iso: string) {
  const diff = Date.now() - +new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}
