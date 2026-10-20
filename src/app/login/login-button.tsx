"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={loading}
      className="w-full rounded-lg bg-foreground px-4 py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {loading ? "Redirecionando…" : "Entrar com Google"}
    </button>
  );
}
