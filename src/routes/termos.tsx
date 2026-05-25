import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";

export const Route = createFileRoute("/termos")({
  component: TermosPage,
  head: () => ({
    meta: [
      { title: "Termos de Uso · Sua bancada" },
    ],
  }),
});

function TermosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4 font-sans select-none selection:bg-primary/20">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar para o Login
        </Link>

        {/* Header */}
        <div className="border-b pb-6 space-y-3">
          <div className="inline-flex items-center gap-2 text-primary">
            <Shield className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Documento Legal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Termos de Serviço</h1>
          <p className="text-sm text-muted-foreground">Última atualização: 25 de maio de 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar a plataforma <strong>Sua bancada</strong>, software SaaS destinado à gestão de marcenarias, você concorda em se submeter a estes Termos de Uso e a todas as leis e regulamentos aplicáveis. Se você não concordar com qualquer um destes termos, fica proibido de usar ou acessar este site.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Descrição do Serviço</h2>
            <p>
              O <strong>Sua bancada</strong> oferece ferramentas de gerenciamento de pedidos, controle de etapas de produção, acompanhamento de orçamentos rápidos e registros financeiros/fluxo de caixa. A plataforma é disponibilizada sob licença de uso temporário mediante o pagamento de uma assinatura periódica.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Cobrança e Assinatura (Cakto)</h2>
            <p>
              A contratação de planos Premium é processada de maneira segura através da integradora <strong>Cakto</strong>. A falta de confirmação de pagamento ou o cancelamento da assinatura implicará na suspensão imediata do acesso aos recursos internos do sistema. O Sua bancada não armazena dados de cartões de crédito diretamente.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. Privacidade e Proteção de Dados (LGPD)</h2>
            <p>
              Em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)</strong>, nós nos comprometemos a proteger a privacidade dos dados inseridos por você. Os dados cadastrais de seus clientes (nome, telefone, endereço) são de sua inteira responsabilidade legal, atuando o <strong>Sua bancada</strong> estritamente como operador destes dados. Os dados coletados serão tratados conforme especificado em nossa Política de Privacidade.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Limitação de Responsabilidade</h2>
            <p>
              Em nenhum caso o <strong>Sua bancada</strong> ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucros cessantes decorrentes da interrupção dos negócios) resultantes do uso ou da incapacidade de usar os serviços da plataforma.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">6. Alterações nos Termos</h2>
            <p>
              O <strong>Sua bancada</strong> pode revisar estes termos de uso a qualquer momento, sem aviso prévio. Ao continuar a utilizar a plataforma, você concorda em ficar vinculado à versão mais recente deste documento.
            </p>
          </section>
        </div>

        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Sua bancada. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
