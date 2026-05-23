import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Hammer, Loader2, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/recuperar-senha")({
  component: RecuperarSenhaPage,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Recuperar senha · Sua bancada" }] }),
});

function RecuperarSenhaPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log("[Recuperação de Senha] Iniciando envio para:", email);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/atualizar-senha`,
      });

      setLoading(false);
      if (error) {
        console.error("Erro ao enviar:", error);
        toast.error("Erro ao solicitar recuperação", { description: error.message });
        return;
      }

      console.log("Link enviado com sucesso:", data);
      toast.success("E-mail enviado! Verifique sua caixa de entrada e a pasta de spam.");
      setSubmitted(true);
    } catch (err: any) {
      setLoading(false);
      console.error("Erro ao enviar:", err);
      toast.error("Erro inesperado", { description: err.message });
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-background to-accent/30 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="size-11 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-[var(--shadow-glow)]">
            <Hammer className="size-5" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight text-lg">Sua bancada</p>
            <p className="text-xs text-muted-foreground">Gestão de Marcenaria</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-7 shadow-[var(--shadow-elevated)] animate-in fade-in zoom-in-95 duration-200">
          {!submitted ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight">Recuperar senha</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Digite seu e-mail cadastrado para receber o link de recuperação.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-medium flex items-center gap-1.5">
                    <Mail className="size-3.5 text-muted-foreground" /> E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition cursor-pointer"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Enviar link de recuperação
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="size-12 rounded-full bg-primary/10 text-primary mx-auto grid place-items-center">
                <Mail className="size-5" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold tracking-tight">Verifique sua caixa de entrada</h1>
                <p className="text-sm text-muted-foreground">
                  Enviamos as instruções de recuperação para o e-mail <strong className="text-foreground">{email}</strong>.
                </p>
              </div>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs text-primary font-medium hover:underline block mx-auto mt-2"
              >
                Não recebeu? Tentar novamente
              </button>
            </div>
          )}

          <div className="mt-6 pt-5 border-t text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
