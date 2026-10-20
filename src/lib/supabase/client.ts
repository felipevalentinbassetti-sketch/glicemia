import { createBrowserClient } from "@supabase/ssr";

// Cliente do Supabase para Client Components (roda no navegador)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
