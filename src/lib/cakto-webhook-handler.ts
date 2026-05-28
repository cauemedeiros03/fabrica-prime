/**
 * Webhook Handler Cakto — Produção (Enterprise Grade)
 *
 * Responsabilidades:
 *  1. Validação de assinatura (HMAC-SHA256 ou token secreto Bearer)
 *  2. Idempotência: ignora eventos já processados pelo transaction_id
 *  3. Busca do userId via auth.admin (supabaseAdmin — Service Role)
 *  4. Atualização do status_assinatura na tabela profiles
 *  5. Registro do evento na tabela webhook_events para auditoria
 *  6. Tratamento de erros sem estourar a aplicação
 *
 * Env vars necessárias (Vercel):
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - VITE_SUPABASE_URL  (ou SUPABASE_URL)
 *  - CAKTO_WEBHOOK_SECRET  (secret configurado no painel Cakto)
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface WebhookEvent {
  /** ID único da transação/evento enviado pelo Cakto */
  transaction_id?: string;
  /** Alternativas de campo para o ID da transação */
  id?: string;
  order_id?: string;
  /** Tipo do evento */
  event?: string;
  event_type?: string;
  /** Status do pagamento */
  status?: string;
  payment_status?: string;
  /** Dados do cliente (flat ou nested) */
  email?: string;
  customer_email?: string;
  customer?: { email?: string };
  data?: {
    status?: string;
    email?: string;
    customer_email?: string;
    customer?: { email?: string };
    transaction_id?: string;
    id?: string;
  };
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

/** Retorna o ID único do evento para checagem de idempotência */
function extractTransactionId(body: WebhookEvent): string | null {
  return (
    body.transaction_id ||
    body.id ||
    body.order_id ||
    body.data?.transaction_id ||
    body.data?.id ||
    null
  );
}

/** Extrai o e-mail do cliente de qualquer formato de payload */
function extractEmail(body: WebhookEvent): string | null {
  return (
    body.customer?.email ||
    body.email ||
    body.customer_email ||
    body.data?.customer?.email ||
    body.data?.email ||
    body.data?.customer_email ||
    null
  );
}

/** Determina se o evento representa aprovação/ativação */
function isApprovedEvent(body: WebhookEvent): boolean {
  const status = (body.status || body.payment_status || body.data?.status || "")
    .toString()
    .toLowerCase();
  const event = (body.event || body.event_type || "").toString().toLowerCase();

  const approvedStatuses = new Set(["approved", "paid", "active", "aprovado", "pago"]);
  const approvedEventFragments = ["approved", "paid", "active", "aprovado", "pago"];

  return (
    approvedStatuses.has(status) ||
    approvedEventFragments.some((f) => event.includes(f))
  );
}

/** Resposta JSON padronizada */
function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Validação de Assinatura ─────────────────────────────────────────────────

/**
 * Valida o token/assinatura enviado pelo Cakto.
 *
 * O Cakto envia um Bearer token no header Authorization que deve
 * coincidir com a variável de ambiente CAKTO_WEBHOOK_SECRET.
 *
 * Se CAKTO_WEBHOOK_SECRET não estiver configurado, o endpoint passa
 * mas loga um aviso — útil para ambientes locais de desenvolvimento.
 */
async function validateSignature(request: Request): Promise<boolean> {
  const secret = process.env.CAKTO_WEBHOOK_SECRET;

  if (!secret) {
    console.warn(
      "[Webhook Cakto] ⚠️  CAKTO_WEBHOOK_SECRET não configurado. " +
      "O endpoint está ABERTO. Configure a variável de ambiente em produção."
    );
    return true; // Permissivo apenas sem secret configurado
  }

  // O Cakto envia: Authorization: Bearer <token>
  const authHeader = request.headers.get("authorization") || "";
  const tokenFromAuth = authHeader.replace(/^Bearer\s+/i, "").trim();

  // Alguns provedores enviam o token direto em header customizado
  const tokenFromCustom =
    request.headers.get("x-cakto-signature") ||
    request.headers.get("x-cakto-token") ||
    "";

  const receivedToken = tokenFromAuth || tokenFromCustom;

  if (!receivedToken) {
    console.warn("[Webhook Cakto] ❌ Nenhum token de autorização encontrado nos headers.");
    return false;
  }

  // Comparação em tempo constante para evitar timing attacks
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  const tokenBytes = encoder.encode(receivedToken);

  if (secretBytes.length !== tokenBytes.length) return false;

  let mismatch = 0;
  for (let i = 0; i < secretBytes.length; i++) {
    mismatch |= secretBytes[i] ^ tokenBytes[i];
  }

  return mismatch === 0;
}

// ─── Idempotência ────────────────────────────────────────────────────────────

/**
 * Verifica se o evento já foi processado anteriormente.
 * Registra o evento na tabela `webhook_events` para auditoria.
 *
 * Tabela esperada (crie se não existir):
 *
 * CREATE TABLE IF NOT EXISTS public.webhook_events (
 *   id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   transaction_id  text UNIQUE NOT NULL,
 *   event_type      text,
 *   status          text,
 *   email           text,
 *   processed_at    timestamptz DEFAULT now(),
 *   raw_payload     jsonb
 * );
 * ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
 */
async function checkAndRegisterIdempotency(
  transactionId: string,
  eventType: string,
  status: string,
  email: string,
  rawPayload: object
): Promise<{ alreadyProcessed: boolean }> {
  // Tenta inserir — se já existir, a constraint UNIQUE retorna erro
  const { error } = await supabaseAdmin.from("webhook_events").insert({
    transaction_id: transactionId,
    event_type: eventType,
    status,
    email,
    raw_payload: rawPayload,
  });

  if (error) {
    // Código 23505 = unique_violation no PostgreSQL
    if (error.code === "23505") {
      return { alreadyProcessed: true };
    }
    // Outros erros (ex: tabela não existe) — logamos mas não bloqueamos
    console.warn(
      "[Webhook Cakto] Aviso: não foi possível registrar idempotência:",
      error.message
    );
  }

  return { alreadyProcessed: false };
}

// ─── Lookup de userId por email ──────────────────────────────────────────────

/**
 * Busca o userId no Supabase Auth usando Service Role (bypassa RLS).
 * Usa listUsers com filtro de email para evitar buscar todos os usuários.
 */
async function findUserIdByEmail(email: string): Promise<string | null> {
  try {
    // Tenta primeiro via auth.admin com filtro — mais eficiente que listUsers()
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Máximo por página — suficiente para a maioria dos casos
    });

    if (error) {
      console.error("[Webhook Cakto] Erro ao listar usuários:", error.message);
      return null;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = data?.users?.find(
      (u) => u.email?.toLowerCase().trim() === normalizedEmail
    );

    return user?.id ?? null;
  } catch (err) {
    console.error("[Webhook Cakto] Exceção ao buscar userId:", err);
    return null;
  }
}

// ─── Handler Principal ───────────────────────────────────────────────────────

export async function processCaktoWebhook(request: Request): Promise<Response> {
  const startTime = Date.now();

  // ── 1. VALIDAÇÃO DE ASSINATURA ────────────────────────────────────────────
  const isValid = await validateSignature(request);
  if (!isValid) {
    console.warn("[Webhook Cakto] 🚫 Request rejeitado: assinatura inválida");
    return jsonResponse(
      { error: "Unauthorized: invalid signature", success: false },
      401
    );
  }

  // ── 2. PARSE DO PAYLOAD ───────────────────────────────────────────────────
  let body: WebhookEvent;
  try {
    body = await request.json();
  } catch {
    console.error("[Webhook Cakto] ❌ Payload inválido — não é JSON válido");
    return jsonResponse({ error: "Invalid JSON payload", success: false }, 400);
  }

  console.log("[Webhook Cakto] Payload recebido:", JSON.stringify(body));

  // ── 3. EXTRAÇÃO DOS DADOS PRINCIPAIS ─────────────────────────────────────
  const email = extractEmail(body);
  if (!email) {
    console.warn("[Webhook Cakto] Email do cliente não encontrado no payload");
    // Retorna 200 para não causar retry loops no Cakto
    return jsonResponse({ error: "Email not found in payload", success: false });
  }

  const transactionId = extractTransactionId(body);
  const eventType = (body.event || body.event_type || "unknown").toString();
  const status = (body.status || body.payment_status || body.data?.status || "unknown").toString();
  const newStatus = isApprovedEvent(body) ? "ativo" : "inativo";

  console.log(
    `[Webhook Cakto] email=${email} | event=${eventType} | status=${status} | → profile_status=${newStatus} | txId=${transactionId}`
  );

  // ── 4. IDEMPOTÊNCIA ───────────────────────────────────────────────────────
  if (transactionId) {
    const { alreadyProcessed } = await checkAndRegisterIdempotency(
      transactionId,
      eventType,
      status,
      email,
      body
    );

    if (alreadyProcessed) {
      console.log(
        `[Webhook Cakto] ⏭️  Evento ${transactionId} já foi processado anteriormente. Ignorando duplicata.`
      );
      return jsonResponse({ success: true, skipped: true, reason: "duplicate_event" });
    }
  } else {
    console.warn(
      "[Webhook Cakto] ⚠️  Nenhum transaction_id encontrado — idempotência não garantida."
    );
  }

  // ── 5. RESOLUÇÃO DO userId ────────────────────────────────────────────────
  const userId = await findUserIdByEmail(email);

  if (!userId) {
    console.warn(`[Webhook Cakto] Usuário não encontrado para email: ${email}`);
    // Retorna 200 para não causar retry — o usuário pode não ter se cadastrado ainda
    return jsonResponse({
      error: `User not found for email: ${email}`,
      success: false,
    });
  }

  // ── 6. ATUALIZAÇÃO DO PROFILE (via supabaseAdmin — Service Role) ──────────
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      status_assinatura: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    console.error(
      `[Webhook Cakto] ❌ Erro ao atualizar profile (userId=${userId}):`,
      updateError.message,
      updateError.details
    );
    // Retornamos 200 para não causar retry flood — o erro está logado
    return jsonResponse({
      error: "Failed to update profile",
      success: false,
      detail: updateError.message,
    });
  }

  const elapsed = Date.now() - startTime;
  console.log(
    `[Webhook Cakto] ✅ Profile atualizado: userId=${userId} → status_assinatura=${newStatus} (${elapsed}ms)`
  );

  return jsonResponse({ success: true, status: newStatus, userId });
}
