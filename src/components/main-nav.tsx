"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Painel" },
  { href: "/registrar", label: "Registrar" },
  { href: "/analises", label: "Análises" },
  { href: "/relatorio", label: "Relatório" },
  { href: "/configuracoes", label: "Configurações" },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 text-sm">
        {LINKS.map((link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
