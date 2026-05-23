import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { createServerFn } from "@tanstack/react-start";

export type UserProfile = {
  id: string;
  nome: string | null;
  status_assinatura?: string | null;
  trial_ends_at?: string | null;
  created_at?: string | null;
};

export type UserSubscription = {
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | null;
  data_expiracao: string | null;
};

const getProfileServer = createServerFn({ method: "GET" })
  .handler(async (ctx: any) => {
    const userId = ctx.data as string;
    const { getCookie } = await import("@tanstack/react-start/server");
    const token = getCookie("sb-access-token");
    if (!token) return null;

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 
                                     process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                                     import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
                                     process.env.SUPABASE_ANON_KEY ||
                                     process.env.VITE_SUPABASE_ANON_KEY ||
                                     import.meta.env?.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      console.error("[useAuth Server] Missing Supabase environment variables");
      return null;
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
      if (authError || !user || user.id !== userId) {
        console.error("[useAuth Server] Invalid token or token/user mismatch");
        return null;
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      return profile;
    } catch (e) {
      console.error("[useAuth Server] Error fetching profile via admin client:", e);
      return null;
    }
  });

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Write token cookies for server-side auth
    const updateAuthCookies = (sess: Session | null) => {
      if (typeof document !== "undefined") {
        if (sess) {
          document.cookie = `sb-access-token=${sess.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
          document.cookie = `sb-refresh-token=${sess.refresh_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
        } else {
          document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      }
    };

    async function fetchProfileAndSubscription(userId: string) {
      try {
        const fetchProfilePromise = (supabase
          .from("profiles") as any)
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout ao buscar dados")), 5000)
        );

        const profileRes = await Promise.race([
          fetchProfilePromise,
          timeoutPromise
        ]) as any;
        
        if (!isMounted) return;

        let profileData = profileRes?.data;

        if (!profileData || profileRes?.error) {
          console.warn("[Auth] Erro ou dados vazios no perfil cliente, tentando via server function...");
          profileData = await getProfileServer({ data: userId } as any);
        }

        if (profileData) {
          setProfile(profileData as UserProfile);

          const status = profileData.status_assinatura;
          const trialEndsAt = (profileData as any).trial_ends_at;
          const isTrialValid = status === "trial" && trialEndsAt && new Date(trialEndsAt) > new Date();

          if (status === "ativo" || status === "active" || isTrialValid) {
            setSubscription({ status: "active", data_expiracao: trialEndsAt || null });
          } else {
            setSubscription({ status: null, data_expiracao: null });
          }
        } else {
          setSubscription(null);
        }
      } catch (err) {
        console.error("[Auth] Exceção na busca de perfil:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    async function initializeSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error("[Auth] Erro ao pegar sessão:", error);
          setLoading(false);
          return;
        }

        let currentSession = data?.session;
        if (currentSession) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            console.warn("[Auth] Token de sessão inválido ou expirado. Limpando sessão residual...");
            await supabase.auth.signOut();
            updateAuthCookies(null);
            currentSession = null;
          }
        }
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        updateAuthCookies(currentSession);
        
        if (currentSession?.user) {
          await fetchProfileAndSubscription(currentSession.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("[Auth] Exceção geral em initializeSession:", err);
        if (isMounted) setLoading(false);
      }
    }

    initializeSession();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      updateAuthCookies(currentSession);
      
      if (currentSession?.user) {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          await fetchProfileAndSubscription(currentSession.user.id);
        }
      } else {
        setProfile(null);
        setSubscription(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, profile, subscription, loading };
}
