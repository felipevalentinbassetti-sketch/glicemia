import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Cliente do Supabase para Server Components, Route Handlers e Server Actions
export async function createClient() {
  // O Supabase usa Date.now() ao validar a sessão; isso só pode rodar no
  // momento do pedido, nunca durante a pré-renderização
  await connection();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components não podem gravar cookies; o proxy renova a sessão
          }
        },
      },
    },
  );
}
