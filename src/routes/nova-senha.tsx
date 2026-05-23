import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Hammer, Loader2, Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/nova-senha")({
  component: NovaSenhaPage,
  head: () => ({ meta: [{ title: "Nova senha · Sua bancada" }] }),
});

function NovaSenhaPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem", { 
        description: "Certifique-se de que a senha digitada em ambos os campos é idêntica." 
      });
      return;
    }

    if (password.length < 6) {
      toast.error("Senha muito curta", { 
        description: "A senha deve ter pelo menos 6 caracteres." 
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      setLoading(false);
      if (error) {
        toast.error("Erro ao redefinir a senha", { description: error.message });
        return;
      }

      toast.success("Senha redefinida com sucesso!", {
        description: "Você já pode entrar usando sua nova senha."
      });
      
      // Clear password field to be safe
      setPassword("");
      setConfirmPassword("");

      // Redirect to login page
      navigate({ to: "/login" });
    } catch (err: any) {
      setLoading(false);
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
          <h1 className="text-xl font-semibold tracking-tight">Definir nova senha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha uma nova senha forte para acessar sua conta.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium flex items-center gap-1.5">
                <Lock className="size-3.5 text-muted-foreground" /> Nova senha
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full h-10 pl-3 pr-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
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

            <div>
              <label className="text-xs font-medium flex items-center gap-1.5">
                <Lock className="size-3.5 text-muted-foreground" /> Confirmar nova senha
              </label>
              <div className="relative mt-1">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full h-10 pl-3 pr-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition cursor-pointer"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Salvar nova senha
            </button>
          </form>

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
