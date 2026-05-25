import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertOctagon, LogOut, CreditCard, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

// Link de checkout da Cakto
const CAKTO_CHECKOUT_URL = import.meta.env.VITE_CAKTO_PLAN_ID || "https://pay.cakto.com.br/63vqari_895705";

export const Route = createFileRoute("/assinatura-pendente")({
  component: AssinaturaPendentePage,
  head: () => ({
    meta: [
      { title: "Acesso Suspenso · Sua bancada" },
    ],
  }),
});

function AssinaturaPendentePage() {
  const navigate = useNavigate();
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (err) {
      console.error("Logout error:", err);
      navigate({ to: "/login" });
    }
  };

  const handlePagar = () => {
    setLoadingCheckout(true);
    window.location.href = CAKTO_CHECKOUT_URL;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <AlertOctagon className="size-4" />
            </div>
            <span className="font-semibold tracking-tight text-lg">Sua bancada</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="size-4" />
            Sair da conta
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md relative group animate-in zoom-in-95 duration-500">
          <div className="absolute -inset-1 bg-gradient-to-r from-destructive to-destructive/50 rounded-[2rem] blur opacity-15 group-hover:opacity-25 transition duration-1000" />
          <div className="relative bg-card rounded-[2rem] border p-8 md:p-10 shadow-2xl flex flex-col items-center text-center space-y-6">
            
            {/* Warning Circle Icon */}
            <div className="size-16 rounded-full bg-destructive/10 text-destructive grid place-items-center animate-pulse">
              <AlertOctagon className="size-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Acesso Suspenso
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Identificamos uma pendência financeira em sua conta ou sua assinatura foi cancelada. Regularize seu plano Premium para reestabelecer o acesso imediatamente.
              </p>
            </div>

            {/* Pricing Summary */}
            <div className="w-full bg-muted/40 border rounded-2xl p-4 flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs text-muted-foreground font-medium uppercase">Plano Premium</p>
                <p className="text-sm font-semibold text-foreground">Acesso Ilimitado</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-foreground">R$ 47</span>
                <span className="text-xs text-muted-foreground font-medium">/mês</span>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handlePagar}
              disabled={loadingCheckout}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 hover:scale-[1.01] transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loadingCheckout ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white animate-infinite" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="size-4" />
                  Regularizar Assinatura
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
            
            <p className="text-xs text-muted-foreground">
              Seu acesso será liberado automaticamente após a confirmação do pagamento.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground border-t">
        <p>&copy; {new Date().getFullYear()} Sua bancada. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
