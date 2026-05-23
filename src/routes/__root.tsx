import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { createServerFn } from "@tanstack/react-start";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-2xl border bg-card p-6 shadow-lg text-center space-y-4">
        <div className="inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground font-semibold">
          Esta página não pôde ser carregada
        </h1>
        <p className="text-sm text-muted-foreground">
          Ocorreu um erro no carregamento desta rota.
        </p>
        {error && (
          <div className="rounded-lg bg-muted p-3 text-left overflow-x-auto max-h-40">
            <code className="text-xs text-destructive break-all font-mono">
              {error.message}
            </code>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-primary h-10 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="flex-1 inline-flex items-center justify-center rounded-lg border border-input bg-background h-10 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao Início
          </a>
        </div>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md w-full rounded-2xl border bg-card p-6 shadow-lg text-center space-y-4">
            <div className="inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-semibold">
              Ops! Algo deu errado
            </h1>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado ao renderizar esta página.
            </p>
            {this.state.error && (
              <div className="rounded-lg bg-muted p-3 text-left overflow-x-auto max-h-40">
                <code className="text-xs text-destructive break-all font-mono">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex h-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const checkUserSubscription = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getCookie } = await import("@tanstack/react-start/server");
    const token = getCookie("sb-access-token");
    if (!token) return { hasActiveSubscription: false, user: null };

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 
                                     process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                                     import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
                                     process.env.SUPABASE_ANON_KEY ||
                                     process.env.VITE_SUPABASE_ANON_KEY ||
                                     import.meta.env?.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      console.error("[checkUserSubscription] Missing Supabase environment variables on server");
      return { hasActiveSubscription: false, user: null };
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const tempSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

      const { data: { user }, error: authError } = await tempSupabase.auth.getUser(token);
      if (authError || !user) return { hasActiveSubscription: false, user: null };

      // Bypass paywall only for system admin email
      const isAdmin = user?.email === "admin@marcena.com.br";

      if (isAdmin) {
        console.log(`[checkUserSubscription] Bypassing subscription check for user: ${user?.email} (isAdmin=${isAdmin})`);
        return {
          hasActiveSubscription: true,
          user,
        };
      }

      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("status_assinatura, trial_ends_at")
          .eq("id", user?.id)
          .maybeSingle();

        if (profileError) {
          console.error("[checkUserSubscription] Database error while fetching profile:", profileError);
          return { hasActiveSubscription: false, user };
        }

        const status = profileData?.status_assinatura;
        const trialEndsAt = (profileData as any)?.trial_ends_at;
        
        let hasActiveSubscription = false;
        if (status === "ativo" || status === "active") {
          hasActiveSubscription = true;
        } else if (status === "trial" && trialEndsAt) {
          hasActiveSubscription = new Date(trialEndsAt) > new Date();
        }

        return {
          hasActiveSubscription,
          user,
        };
      } catch (dbErr) {
        console.error("[checkUserSubscription] Database connection error:", dbErr);
        return { hasActiveSubscription: false, user };
      }
    } catch (err) {
      console.error("[checkUserSubscription] Error checking user session/subscription on server:", err);
      return { hasActiveSubscription: false, user: null };
    }
  });

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    // Skip check for public routes and API endpoints
    const isPublic = ["/login", "/cadastro", "/assinatura", "/auth/callback", "/recuperar-senha", "/atualizar-senha"].includes(location.pathname);
    const isApi = location.pathname.startsWith("/api/");

    if (isApi) return;

    if (typeof window === "undefined") {
      // Server-side paywall validation
      try {
        const { hasActiveSubscription, user } = await checkUserSubscription();

        if (!user) {
          if (!isPublic) throw redirect({ to: "/login" });
          return;
        }

        if (!isPublic) {
          if (!hasActiveSubscription) {
            throw redirect({ to: "/assinatura" });
          }
        } else {
          // If on public pages but already subscribed, redirect to dashboard
          if (hasActiveSubscription) {
            throw redirect({ to: "/" });
          }
        }
      } catch (err) {
        // Rethrow redirect exceptions
        if (err && typeof err === "object" && ("status" in err || "to" in err)) {
          throw err;
        }
        console.error("[Server Auth] Paywall validation error:", err);
        if (!isPublic) throw redirect({ to: "/login" });
      }
    } else {
      // Client-side paywall validation
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!isPublic) throw redirect({ to: "/login" });
          return;
        }

        let hasActiveSubscription = false;
        
        // Client-side bypass check
        const isAdmin = user?.email === "admin@marcena.com.br";

        if (isAdmin) {
          console.log(`[Client Auth] Bypassing subscription check for user: ${user?.email} (isAdmin=${isAdmin})`);
          hasActiveSubscription = true;
        } else {
          try {
            const { data: profileData, error: profileError } = await (supabase
              .from("profiles") as any)
              .select("status_assinatura, trial_ends_at")
              .eq("id", user?.id)
              .maybeSingle();

            if (profileError || !profileData) {
              console.warn("[Client Auth] Database error or missing profile, falling back to server check:", profileError);
              const serverCheck = await checkUserSubscription();
              hasActiveSubscription = serverCheck.hasActiveSubscription;
            } else {
              const status = profileData?.status_assinatura;
              const trialEndsAt = (profileData as any)?.trial_ends_at;
              if (status === "ativo" || status === "active") {
                hasActiveSubscription = true;
              } else if (status === "trial" && trialEndsAt) {
                hasActiveSubscription = new Date(trialEndsAt) > new Date();
              }
            }
          } catch (dbErr) {
            console.error("[Client Auth] Connection error while fetching profile, falling back to server check:", dbErr);
            const serverCheck = await checkUserSubscription();
            hasActiveSubscription = serverCheck.hasActiveSubscription;
          }
        }

        if (!isPublic) {
          if (!hasActiveSubscription) {
            throw redirect({ to: "/assinatura" });
          }
        } else {
          if (hasActiveSubscription) {
            throw redirect({ to: "/" });
          }
        }
      } catch (err) {
        if (err && typeof err === "object" && ("status" in err || "to" in err)) {
          throw err;
        }
        console.error("[Client Auth] Paywall validation error:", err);
        if (!isPublic) throw redirect({ to: "/login" });
      }
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sua bancada — Gestão de Marcenaria" },
      { name: "description", content: "Gestão completa de pedidos, produção e finanças para marcenarias e fábricas de móveis sob medida." },
      { name: "author", content: "Sua bancada" },
      { property: "og:title", content: "Sua bancada — Gestão de Marcenaria" },
      { property: "og:description", content: "Pedidos, produção e financeiro em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
