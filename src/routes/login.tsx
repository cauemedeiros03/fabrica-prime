import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Hammer, Loader2, Eye, EyeOff, Zap, PiggyBank } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (session) {
      if (session?.user?.email_confirmed_at) {
        throw redirect({ to: "/" });
      } else {
        // Limpa sessão residual não confirmada para evitar loops
        await supabase.auth.signOut();
        document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    }
  },
  head: () => ({ meta: [{ title: "Entrar · Sua bancada" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [manterConectado, setManterConectado] = useState(true);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error("Erro ao autenticar com o Google", { description: error.message });
      }
    } catch (err: any) {
      toast.error("Erro inesperado", { description: err.message });
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setWarningMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      console.error("[Login] Erro de autenticação:", error);
      // Limpa qualquer estado residual/cookie se o login falhar
      await supabase.auth.signOut();
      document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      
      const isEmailNotConfirmed = error.message?.toLowerCase().includes("email not confirmed") || 
                                  error.message?.toLowerCase().includes("confirmar") ||
                                  error.message?.toLowerCase().includes("confirmado");

      if (isEmailNotConfirmed) {
        setWarningMsg("Este e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada.");
        toast.error("E-mail não confirmado", {
          description: "Por favor, verifique sua caixa de entrada (e a pasta de spam) para ativar sua conta.",
        });
      } else {
        toast.error("Credenciais inválidas", { description: error.message });
      }
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background font-sans selection:bg-primary/20">
      
      {/* Lado Esquerdo - Painel Institucional/Premium */}
      <div className="hidden md:flex flex-col justify-between p-16 bg-[oklch(0.22_0.03_145)] text-primary-foreground relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-40 -left-40 size-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-45 -right-45 size-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        
        {/* Logo/Branding */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-lg">
            <Hammer className="size-4.5" strokeWidth={2.4} />
          </div>
          <div className="leading-none">
            <span className="font-bold tracking-tight text-white text-lg">Sua bancada</span>
            <p className="text-[10px] text-primary-foreground/50 mt-0.5">Gestão da sua marcenaria</p>
          </div>
        </div>

        {/* Headline */}
        <div className="my-auto space-y-6 max-w-md relative z-10">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-[1.2] text-balance">
            O sistema que dá um jeito definitivo na sua marcenaria e faz você ganhar mais dinheiro.
          </h2>
          <p className="text-primary-foreground/70 text-sm leading-relaxed text-balance">
            Pare de queimar margem de lucro com desperdício e orçamentos calculados de cabeça. Descubra exatamente para onde está indo o seu dinheiro, domine seus prazos de produção e multiplique seu faturamento com a ferramenta que se paga sozinha já no primeiro mês.
          </p>
        </div>

        {/* Features & Footer */}
        <div className="space-y-8 max-w-md relative z-10">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-primary shrink-0">
                <Zap className="size-5 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-white text-sm">Controle de Projetos Ágil</h4>
                <p className="text-xs text-primary-foreground/60 leading-relaxed">
                  Acompanhe cada etapa de fabricação de forma simples, visual e dinâmica.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="size-10 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-primary shrink-0">
                <PiggyBank className="size-5 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-white text-sm">Clareza nas Finanças</h4>
                <p className="text-xs text-primary-foreground/60 leading-relaxed">
                  Saiba exatamente para onde vai o dinheiro com fluxo de caixa simplificado.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="text-xs text-primary-foreground/40">
              &copy; {new Date().getFullYear()} Sua bancada. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="flex flex-col justify-between min-h-screen py-10 px-6 sm:px-12 lg:px-20 bg-background overflow-y-auto">
        
        {/* Mobile Header Logo */}
        <div className="md:hidden flex items-center justify-center gap-2 mb-8">
          <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-md">
            <Hammer className="size-4.5" strokeWidth={2.4} />
          </div>
          <span className="font-bold text-foreground text-lg">Sua bancada</span>
        </div>

        {/* Central Form Container */}
        <div className="my-auto w-full max-w-[420px] mx-auto space-y-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Acesso Sua bancada
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Entre com suas credenciais
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Continue gerenciando seus pedidos, orçamentos e finanças com total controle.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-[var(--shadow-elevated)] space-y-6">
            {warningMsg && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm leading-relaxed flex gap-2.5 items-start animate-in fade-in slide-in-from-top-2 duration-200">
                <span className="text-base leading-none mt-0.5">⚠️</span>
                <span>{warningMsg}</span>
              </div>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1.5 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha</label>
                  <Link to="/recuperar-senha" className="text-xs text-primary font-medium hover:underline">
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha de acesso"
                    className="w-full h-10 pl-3 pr-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Manter conectado */}
              <div className="space-y-1 pt-1">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manterConectado}
                    onChange={(e) => setManterConectado(e.target.checked)}
                    className="size-4 rounded border-input text-primary focus:ring-ring focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-foreground select-none">Manter conectado</span>
                </label>
                <p className="text-[11px] text-muted-foreground pl-6">
                  Use apenas em dispositivos confiáveis.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 active:scale-[0.99] disabled:opacity-60 transition cursor-pointer shadow-md"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Entrar
                </button>

                <a
                  href="https://pay.cakto.com.br/63vqari_895705"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border bg-background hover:bg-accent text-foreground text-sm font-medium transition cursor-pointer"
                >
                  Quero assinar o Sua bancada &rarr;
                </a>
              </div>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">Ou continue com</span>
              </div>
            </div>

            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <svg className="size-4 animate-infinite" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.16 2.64 1.077 6.555l4.19 3.21Z"
                />
                <path
                  fill="#FBBC05"
                  d="M1.077 6.555A12.013 12.013 0 0 0 0 12c0 1.93.46 3.75 1.277 5.373l4.24-3.29a7.013 7.013 0 0 1-.45-2.083c0-2.3.83-4.42 2.199-6.045l-4.19-3.21Z"
                />
                <path
                  fill="#4285F4"
                  d="M12 24c3.245 0 5.973-1.073 7.964-2.927l-3.864-3c-1.127.755-2.564 1.209-4.1 1.209-3.2 0-5.91-2.164-6.873-5.073l-4.24 3.29C3.16 21.36 7.27 24 12 24Z"
                />
                <path
                  fill="#34A853"
                  d="M24 12c0-.86-.073-1.69-.218-2.5H12v4.727h6.727c-.29 1.527-1.154 2.818-2.454 3.69l3.864 3C22.382 19.182 24 15.818 24 12Z"
                />
              </svg>
              Entrar com o Google
            </button>

            <p className="text-xs text-center text-muted-foreground">
              Ainda não tem conta?{" "}
              <Link to="/cadastro" className="text-primary font-semibold hover:underline">
                Criar conta gratuita
              </Link>
            </p>
          </div>

          {/* Card de Suporte WhatsApp */}
          <div className="rounded-2xl border bg-muted/30 p-5 space-y-3.5">
            <div className="space-y-1">
              <h4 className="font-semibold text-sm text-foreground">Precisa de ajuda rápida?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nosso suporte responde rápido pelo WhatsApp. Clique abaixo para falar conosco sempre que precisar.
              </p>
            </div>
            <a
              href="https://wa.me/5582998360560?text=Olá!%20Preciso%20de%20ajuda%20para%20acessar%20o%20Sua%20bancada."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-lg bg-[oklch(0.55_0.15_145)] text-white hover:bg-[oklch(0.5_0.14_145)] text-xs font-semibold transition active:scale-[0.99] cursor-pointer"
            >
              Falar com o suporte
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-center gap-4 text-xs text-muted-foreground border-t pt-6">
          <Link to="/termos" className="hover:underline">Termos de Uso</Link>
          <span>•</span>
          <Link to="/privacidade" className="hover:underline">Política de Privacidade</Link>
        </div>
      </div>

    </div>
  );
}
