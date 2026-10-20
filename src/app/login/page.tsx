import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginButton } from "./login-button";

const ERRORS: Record<string, string> = {
  "nao-autorizado": "Esta conta Google não tem acesso a este app.",
  falha: "Não foi possível entrar. Tente novamente.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold">Glicemia</h1>
        <p className="mt-1 text-sm text-muted">
          Acompanhamento pessoal de glicemia
        </p>

        <Suspense>
          <LoginError searchParams={searchParams} />
        </Suspense>

        <div className="mt-6">
          <LoginButton />
        </div>
      </div>

      <div className="mt-6">
        <ThemeToggle />
      </div>
    </main>
  );
}

async function LoginError({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { erro } = await searchParams;
  const message = typeof erro === "string" ? ERRORS[erro] : undefined;
  if (!message) return null;

  return (
    <p
      role="alert"
      className="mt-6 rounded-lg border border-glucose-very-low/40 bg-glucose-very-low/10 px-3 py-2 text-sm"
    >
      {message}
    </p>
  );
}
