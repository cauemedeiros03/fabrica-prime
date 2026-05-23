import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Hammer, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Entrar · Sua bancada" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      console.error("[Login] Erro de autenticação:", error);
      // Limpa qualquer estado residual/cookie se o login falhar
      await supabase.auth.signOut();
      document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      
      toast.error("Credenciais inválidas", { description: error.message });
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/" });
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

        <div className="rounded-2xl border bg-card p-7 shadow-[var(--shadow-elevated)]">
          <h1 className="text-xl font-semibold tracking-tight">Entrar na sua conta</h1>
          <p className="text-sm text-muted-foreground mt-1">Acesse o painel da sua marcenaria</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Senha</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <div className="mt-1.5 text-right">
                <Link to="/recuperar-senha" className="text-xs text-primary font-medium hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Entrar
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg border bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
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

          <p className="mt-5 text-xs text-center text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="text-primary font-medium hover:underline">
              Criar conta gratuita
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
