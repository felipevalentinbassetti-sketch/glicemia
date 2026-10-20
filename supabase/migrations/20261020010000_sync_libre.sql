-- Sincronização automática com o LibreLinkUp
-- O pg_cron chama a rota /api/sync do app na Vercel a cada 5 minutos via pg_net.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- =============================================================
-- Token do LibreLinkUp em cache (evita login a cada sincronização)
-- =============================================================
create table public.libre_sessions (
  user_id uuid primary key references auth.users on delete cascade,
  host text not null,
  token text not null,
  expires_at timestamptz not null,
  account_id_hash text not null,
  updated_at timestamptz not null default now()
);

-- Sem policies: só a chave secreta (servidor) acessa
alter table public.libre_sessions enable row level security;

-- =============================================================
-- Agendamento: a cada 5 minutos
-- O segredo fica no Vault com o nome 'sync_secret' (cadastrado à parte)
-- =============================================================
select cron.schedule(
  'sync-libre',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://glicemia-mu.vercel.app/api/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'sync_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
