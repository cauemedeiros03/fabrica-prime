export type StatusEtapa =
  | "pedido-recebido"
  | "separando-madeira"
  | "corte"
  | "montagem"
  | "acabamento"
  | "qualidade"
  | "pronto-entrega"
  | "entregue";

export const ETAPAS: { id: StatusEtapa; label: string; cor: string }[] = [
  { id: "pedido-recebido", label: "Pedido Recebido", cor: "oklch(0.55 0.14 240)" },
  { id: "separando-madeira", label: "Separando Madeira", cor: "oklch(0.6 0.12 60)" },
  { id: "corte", label: "Corte da Madeira", cor: "oklch(0.65 0.14 40)" },
  { id: "montagem", label: "Montagem", cor: "oklch(0.55 0.14 30)" },
  { id: "acabamento", label: "Acabamento", cor: "oklch(0.55 0.16 320)" },
  { id: "qualidade", label: "Revisão de Qualidade", cor: "oklch(0.6 0.12 200)" },
  { id: "pronto-entrega", label: "Pronto para Entrega", cor: "oklch(0.55 0.14 160)" },
  { id: "entregue", label: "Entregue", cor: "oklch(0.5 0.1 145)" },
];

export type Prioridade = "baixa" | "media" | "alta" | "urgente";

export interface Pedido {
  id: string;
  numero: string;
  cliente: string;
  telefone: string;
  cidade: string;
  produto: string;
  tipo: string;
  material: string;
  cor: string;
  valorTotal: number;
  valorPago: number;
  entrega: string; // ISO
  criadoEm: string;
  /** updated_at do Supabase — data real da última alteração do pedido.
   *  Usado pelo filtro de arquivamento automático no Kanban (7 dias em "entregue").
   *  Opcional para compatibilidade com dados mock. */
  atualizadoEm?: string;
  etapa: StatusEtapa;
  prioridade: Prioridade;
  clientes?: { nome: string } | null;
  anexos?: string[];
  excluido?: boolean;
  deleted?: boolean;
  ativo?: boolean;
  desconto?: number;
}

const hoje = new Date();
const dia = (offset: number) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

export const PEDIDOS: Pedido[] = [
  { id: "1", numero: "#1042", cliente: "Joana Marques", telefone: "(11) 98765-1234", cidade: "São Paulo, SP", produto: "Estante Modular Carvalho", tipo: "Estante", material: "Carvalho americano", cor: "Natural", valorTotal: 8400, valorPago: 4200, entrega: dia(7), criadoEm: dia(-12), etapa: "montagem", prioridade: "alta" },
  { id: "2", numero: "#1043", cliente: "Ricardo Almeida", telefone: "(11) 99887-2233", cidade: "Campinas, SP", produto: "Mesa de Jantar 8 Lugares", tipo: "Mesa", material: "Freijó maciço", cor: "Mel envernizado", valorTotal: 12800, valorPago: 6400, entrega: dia(3), criadoEm: dia(-20), etapa: "acabamento", prioridade: "urgente" },
  { id: "3", numero: "#1044", cliente: "Patrícia Lopes", telefone: "(21) 97654-3322", cidade: "Niterói, RJ", produto: "Guarda-Roupa Planejado", tipo: "Guarda-Roupa", material: "MDF revestido", cor: "Off white", valorTotal: 18900, valorPago: 9450, entrega: dia(15), criadoEm: dia(-5), etapa: "corte", prioridade: "media" },
  { id: "4", numero: "#1045", cliente: "Marcos Vieira", telefone: "(31) 98123-7788", cidade: "BH, MG", produto: "Cabeceira Estofada Queen", tipo: "Cabeceira", material: "Compensado + Linho", cor: "Bege areia", valorTotal: 3200, valorPago: 3200, entrega: dia(-2), criadoEm: dia(-18), etapa: "pronto-entrega", prioridade: "alta" },
  { id: "5", numero: "#1046", cliente: "Luísa Andrade", telefone: "(48) 99812-4455", cidade: "Florianópolis, SC", produto: "Rack para TV 75\"", tipo: "Rack", material: "Cumaru", cor: "Imbuia", valorTotal: 6700, valorPago: 2010, entrega: dia(12), criadoEm: dia(-3), etapa: "separando-madeira", prioridade: "media" },
  { id: "6", numero: "#1047", cliente: "Gabriel Souza", telefone: "(85) 99201-7733", cidade: "Fortaleza, CE", produto: "Conjunto Banquetas Bistrô", tipo: "Banqueta", material: "Eucalipto", cor: "Natural fosco", valorTotal: 2400, valorPago: 1200, entrega: dia(20), criadoEm: dia(-1), etapa: "pedido-recebido", prioridade: "baixa" },
  { id: "7", numero: "#1041", cliente: "Família Tonnetti", telefone: "(11) 98000-1199", cidade: "Santo André, SP", produto: "Cozinha Planejada Completa", tipo: "Cozinha", material: "MDF + Carvalho", cor: "Verde oliva", valorTotal: 42500, valorPago: 21250, entrega: dia(28), criadoEm: dia(-25), etapa: "acabamento", prioridade: "alta" },
  { id: "8", numero: "#1040", cliente: "Estúdio Norte", telefone: "(11) 97777-8888", cidade: "São Paulo, SP", produto: "Mesa de Reunião 12 lugares", tipo: "Mesa", material: "Imbuia maciça", cor: "Natural envernizado", valorTotal: 22000, valorPago: 22000, entrega: dia(-15), criadoEm: dia(-45), etapa: "entregue", prioridade: "media" },
  { id: "9", numero: "#1039", cliente: "Helena Costa", telefone: "(41) 99876-5544", cidade: "Curitiba, PR", produto: "Aparador Hall Entrada", tipo: "Aparador", material: "Marfim maciça", cor: "Branco patina", valorTotal: 4800, valorPago: 2400, entrega: dia(5), criadoEm: dia(-10), etapa: "qualidade", prioridade: "media" },
];

export const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dataBR = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const PRIORIDADE_COR: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-info/15 text-info",
  alta: "bg-warning/20 text-warning-foreground",
  urgente: "bg-destructive/15 text-destructive",
};

export const RECEITA_MENSAL = [
  { mes: "Mai", receita: 38000, custo: 22000 },
  { mes: "Jun", receita: 52000, custo: 28000 },
  { mes: "Jul", receita: 47000, custo: 26000 },
  { mes: "Ago", receita: 61000, custo: 31000 },
  { mes: "Set", receita: 73000, custo: 36000 },
  { mes: "Out", receita: 88000, custo: 41000 },
  { mes: "Nov", receita: 96400, custo: 44200 },
];
