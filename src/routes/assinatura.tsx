import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, LogOut, Package, Star, TrendingUp, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { createServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/assinatura")({
  component: AssinaturaPage,
  head: () => ({
    meta: [
      { title: "Assinatura · Sua bancada" },
    ],
  }),
});

function AssinaturaPage() {
  const navigate = useNavigate();
  const [loadingSession, setLoadingSession] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (err) {
      console.error("Logout error:", err);
      navigate({ to: "/login" });
    }
  };

  const handleAssinar = () => {
    setLoadingSession(true);
    const checkoutUrl = import.meta.env.VITE_CAKTO_PLAN_ID;
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      toast.error("URL de checkout da Cakto não configurada.");
      setLoadingSession(false);
    }
  };



  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary/20">
      {/* Navbar Minimalista */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Package className="size-4" />
            </div>
            <span className="font-semibold tracking-tight text-lg">Sua bancada ERP</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <LogOut className="size-4" />
            Sair da conta
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-16 px-4">
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16 animate-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Sua assinatura está inativa
          </h1>
          <p className="text-lg text-muted-foreground">
            Para continuar gerenciando sua marcenaria com eficiência, organizar pedidos e controlar seu financeiro, escolha nosso plano Premium.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="w-full max-w-lg relative group animate-in zoom-in-95 duration-700 delay-150">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary/50 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          <div className="relative bg-card rounded-[2rem] border p-8 md:p-10 shadow-2xl flex flex-col items-center text-center">
            
            <div className="absolute -top-4 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium tracking-wide shadow-lg flex items-center gap-1.5">
              <Star className="size-3.5 fill-current" />
              Plano Mais Vendido
            </div>

            <h2 className="text-2xl font-semibold mt-4">Premium Ilimitado</h2>
            <div className="my-6">
              <span className="text-5xl font-bold tracking-tighter">R$ 47</span>
              <span className="text-muted-foreground font-medium">/mês</span>
            </div>

            <p className="text-sm text-muted-foreground mb-8">
              Tenha controle absoluto da sua marcenaria sem limites de uso. Cancele quando quiser.
            </p>

            <ul className="w-full space-y-4 text-left mb-8">
              {[
                { icon: Package, text: "Pedidos e orçamentos ilimitados" },
                { icon: TrendingUp, text: "Gestão financeira completa" },
                { icon: ShieldCheck, text: "Controle de etapas de produção" },
                { icon: Check, text: "Cadastro de clientes e fornecedores" },
                { icon: Check, text: "Relatórios de desempenho mensais" },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="size-6 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
                    <item.icon className="size-3.5" />
                  </div>
                  <span className="text-sm font-medium">{item.text}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleAssinar}
              disabled={loadingSession}
              className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loadingSession ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white animate-infinite" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Redirecionando...
                </>
              ) : (
                "Assinar Agora"
              )}
            </button>
            <p className="text-xs text-muted-foreground mt-4">
              Pagamento 100% seguro via Cakto.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t">
        <p>&copy; {new Date().getFullYear()} Sua bancada ERP. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
