import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recebe o retorno do login com Google e troca o código pela sessão
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erro=falha`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?erro=falha`);
  }

  // Segunda barreira além do trigger no banco: só o e-mail do dono entra
  const allowed = process.env.ALLOWED_EMAIL?.toLowerCase();
  if (!allowed || data.user.email?.toLowerCase() !== allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?erro=nao-autorizado`);
  }

  return NextResponse.redirect(`${origin}/`);
}
