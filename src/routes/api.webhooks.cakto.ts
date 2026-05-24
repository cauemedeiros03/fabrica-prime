import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/webhooks/cakto")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          console.log("[Webhook Cakto] Received payload:", body);

          // Support various formats for email
          const email = body.customer?.email || body.email || body.customer_email || body.data?.customer?.email || body.data?.email || body.data?.customer_email;
          if (!email) {
            console.warn("[Webhook Cakto] Email not found in payload");
            return new Response(JSON.stringify({ error: "Email not found in payload", success: false }), {
              status: 200, // Return 200 to acknowledge webhook delivery and prevent loops
              headers: { "Content-Type": "application/json" },
            });
          }

          // Check status/event
          const status = (body.status || body.payment_status || body.data?.status || "").toString().toLowerCase();
          const event = (body.event || body.event_type || "").toString().toLowerCase();

          const isApproved = 
            status === "approved" || 
            status === "paid" || 
            status === "active" || 
            status === "aprovado" ||
            status === "pago" ||
            event === "payment.approved" || 
            event === "payment.paid" ||
            event === "subscription.active" ||
            event.includes("approved") || 
            event.includes("paid") || 
            event.includes("active") || 
            event.includes("aprovado") || 
            event.includes("pago");

          const newStatus = isApproved ? "ativo" : "inativo";
          console.log(`[Webhook Cakto] User email: ${email}, determined status: ${newStatus}`);

          // Resolve userId by email
          const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL;
          const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY;

          let userId: string | null = null;

          if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
            try {
              const { createClient } = await import("@supabase/supabase-js");
              const authSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
                db: { schema: "auth" },
                auth: { persistSession: false }
              });
              
              const { data: userData, error: userError } = await authSupabase
                .from("users")
                .select("id")
                .eq("email", email)
                .maybeSingle();

              if (userData?.id) {
                userId = userData.id;
              }
            } catch (e) {
              console.error("[Webhook Cakto] Error querying auth schema:", e);
            }
          }

          if (!userId) {
            const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (listData?.users) {
              const user = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
              if (user) {
                userId = user.id;
              }
            }
          }

          if (!userId) {
            console.warn(`[Webhook Cakto] User not found for email: ${email}`);
            return new Response(JSON.stringify({ error: `User not found for email: ${email}`, success: false }), {
              status: 200, // Return 200 to acknowledge webhook delivery even if user is missing
              headers: { "Content-Type": "application/json" },
            });
          }

          // Update status in profiles
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({ status_assinatura: newStatus })
            .eq("id", userId);

          if (updateError) {
            console.error("[Webhook Cakto] Error updating profile status:", updateError);
            return new Response(JSON.stringify({ error: "Failed to update profile", success: false }), {
              status: 200, // Return 200 to prevent retries for non-transient update issues
              headers: { "Content-Type": "application/json" },
            });
          }

          console.log(`[Webhook Cakto] Profile status updated successfully to ${newStatus} for user ${userId}`);
          return new Response(JSON.stringify({ success: true, status: newStatus }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error: any) {
          console.error("[Webhook Cakto] Error processing webhook:", error);
          return new Response(JSON.stringify({ error: error.message || "Internal Server Error", success: false }), {
            status: 200, // Always return 200 to avoid webhook loop/retry flooding
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
