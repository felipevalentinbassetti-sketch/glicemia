"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Recarrega os dados do servidor periodicamente (e ao voltar para a aba)
export function AutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, intervalMs]);

  return null;
}
