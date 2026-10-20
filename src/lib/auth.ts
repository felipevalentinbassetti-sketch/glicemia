import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Usuário logado + cliente de sessão; manda para /login se não houver sessão.
// `now` é o horário do pedido, para as páginas calcularem períodos ("últimas 24 h").
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return { supabase, user, now: Date.now() };
}
