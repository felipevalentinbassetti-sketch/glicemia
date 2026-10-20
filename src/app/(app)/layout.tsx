import { MainNav } from "@/components/main-nav";

// Moldura das páginas logadas: cabeçalho e menu são estáticos (carregam na hora)
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="no-print border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-semibold">Glicemia</p>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
              >
                Sair
              </button>
            </form>
          </div>
          <MainNav />
        </div>
      </header>

      {children}

      <footer className="no-print px-4 pb-6 text-center text-xs text-muted">
        Este app não substitui o aplicativo oficial do sensor nem orientação
        médica.
      </footer>
    </div>
  );
}
