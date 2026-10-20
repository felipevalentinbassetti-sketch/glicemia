import { createClient } from "@supabase/supabase-js";

// Cliente com a chave secreta: ignora o RLS. Usar SOMENTE em código de servidor
// que não depende de sessão de usuário (ex.: a sincronização agendada).
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY não configurada");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
