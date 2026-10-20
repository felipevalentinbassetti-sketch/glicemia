# Glicemia

App web pessoal para acompanhamento de glicemia (FreeStyle Libre). As premissas do projeto estão em [`PROJETO.md`](PROJETO.md).

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4) + Supabase (Postgres, Auth) + Vercel.

## Configuração

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode o conteúdo de [`supabase/migrations/20261020000000_init.sql`](supabase/migrations/20261020000000_init.sql).
3. Ainda no SQL Editor, autorize o seu e-mail:
   ```sql
   insert into public.allowed_emails (email) values ('voce@gmail.com');
   ```

### 2. Login com Google

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um **ID do cliente OAuth** do tipo "Aplicativo da Web".
   - Em **URIs de redirecionamento autorizados**, adicione `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
2. No Supabase, em **Authentication > Sign In / Providers > Google**, ative o provedor e cole o Client ID e o Client Secret.
3. Em **Authentication > URL Configuration**:
   - **Site URL:** `http://localhost:3000` (troque pela URL do Vercel depois do deploy).
   - **Redirect URLs:** adicione `http://localhost:3000/auth/callback` (e depois `https://SEU-APP.vercel.app/auth/callback`).

### 3. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha `.env.local` com a URL e a chave publishable do projeto (Supabase > Project Settings > API Keys) e com o seu e-mail em `ALLOWED_EMAIL`.

### 4. Rodar

```bash
npm install
npm run dev
```

Acesse http://localhost:3000.

## Estrutura

```
src/
  app/
    page.tsx              # painel (protegido)
    login/                # tela de login com Google
    auth/callback/        # retorno do OAuth + checagem do e-mail autorizado
    auth/signout/         # logout (POST)
  components/             # tema claro/escuro
  lib/supabase/           # clientes do Supabase (navegador, servidor, proxy)
  proxy.ts                # renova a sessão e protege as rotas
supabase/migrations/      # esquema do banco (tabelas + RLS)
```
