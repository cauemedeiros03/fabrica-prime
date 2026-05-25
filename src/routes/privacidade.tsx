import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  component: PrivacidadePage,
  head: () => ({
    meta: [
      { title: "Política de Privacidade · Sua bancada" },
    ],
  }),
});

function PrivacidadePage() {
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
            <ShieldCheck className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Documento Legal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground">Última atualização: 25 de maio de 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Compromisso com a Privacidade</h2>
            <p>
              A sua privacidade é de extrema importância para nós. É política do <strong>Sua bancada</strong> respeitar a sua privacidade e de seus clientes em relação a qualquer informação que possamos coletar no site Sua bancada e outras plataformas que possuímos e operamos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Coleta de Informações</h2>
            <p>
              Solicitamos informações pessoais (como nome, e-mail, telefone) apenas quando realmente precisamos delas para lhe fornecer o serviço de gestão contratado. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também coletamos os dados de seus clientes que você decide cadastrar na plataforma para fins exclusivos de sua operação interna.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Uso de Dados e Segurança (LGPD)</h2>
            <p>
              Garantimos a segurança dos dados armazenados contra perdas, roubos, acesso não autorizado, divulgação, cópia, uso ou modificação imprópria. Todos os dados são transmitidos de forma criptografada (HTTPS) e armazenados em infraestrutura de nuvem segura (via Supabase). Em conformidade com a <strong>LGPD</strong>, você tem o direito de solicitar a exclusão de seus dados pessoais a qualquer momento.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. Compartilhamento com Terceiros</h2>
            <p>
              Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei ou quando estritamente necessário para a prestação do serviço (como no envio de dados de checkout de pagamento para a <strong>Cakto</strong>).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Responsabilidade sobre Dados de Terceiros</h2>
            <p>
              O <strong>Sua bancada</strong> funciona como operador tecnológico dos dados de clientes que você cadastra na plataforma. Você declara, na qualidade de controlador dos dados, que possui base legal legítima para coletar e processar as informações de seus respectivos clientes e fornecedores.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">6. Contato e Dúvidas</h2>
            <p>
              Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contato conosco através dos canais de suporte oficiais.
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
