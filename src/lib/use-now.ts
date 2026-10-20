"use client";

import { useSyncExternalStore } from "react";

// Hora atual arredondada ao minuto, atualizada a cada minuto.
// No servidor (e na hidratação) devolve 0, então quem usa deve tratar "ainda sem hora".
function subscribe(callback: () => void) {
  const id = setInterval(callback, 30_000);
  return () => clearInterval(id);
}

const getSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const getServerSnapshot = () => 0;

export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
