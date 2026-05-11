import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { NovoPedidoDialog } from "./novo-pedido-dialog";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Loader2, X } from "lucide-react";

export function AppShell({
  title,
  subtitle,
  breadcrumbs,
  children,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [novoPedido, setNovoPedido] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  useRealtimeSync();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  // scroll-to-top on route change
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, left: 0 });
    setMobileNav(false);
  }, [location.pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-2xl animate-in slide-in-from-left">
            <button
              onClick={() => setMobileNav(false)}
              className="absolute right-3 top-3 size-8 grid place-items-center rounded-lg hover:bg-sidebar-accent z-10"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
            <div className="block lg:hidden h-full [&>aside]:!flex [&>aside]:w-full">
              <AppSidebar />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          title={title}
          subtitle={subtitle}
          onNovoPedido={() => setNovoPedido(true)}
          onOpenNav={() => setMobileNav(true)}
        />
        <main className="flex-1 p-6 lg:p-8 animate-in fade-in duration-200">
          {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
          {children}
        </main>
      </div>
      <NovoPedidoDialog open={novoPedido} onOpenChange={setNovoPedido} />
    </div>
  );
}
