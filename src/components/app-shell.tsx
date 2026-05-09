import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { NovoPedidoDialog } from "./novo-pedido-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [novoPedido, setNovoPedido] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

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
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader title={title} subtitle={subtitle} onNovoPedido={() => setNovoPedido(true)} />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
      <NovoPedidoDialog open={novoPedido} onOpenChange={setNovoPedido} />
    </div>
  );
}
