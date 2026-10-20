-- Esquema inicial do app de glicemia
-- Todas as tabelas pertencem a um usuário (user_id) e são protegidas por RLS.

-- =============================================================
-- Allowlist: só e-mails cadastrados aqui conseguem criar conta
-- =============================================================
create table public.allowed_emails (
  email text primary key check (email = lower(email))
);

-- Sem policies: só o service role / SQL editor acessa
alter table public.allowed_emails enable row level security;

create function public.enforce_allowed_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.allowed_emails where email = lower(new.email)
  ) then
    raise exception 'E-mail não autorizado: %', new.email;
  end if;
  return new;
end;
$$;

create trigger enforce_allowed_email
  before insert on auth.users
  for each row execute function public.enforce_allowed_email();

-- =============================================================
-- Configurações do usuário
-- =============================================================
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  target_low smallint not null default 70,
  target_high smallint not null default 180,
  last_sync_at timestamptz,
  last_sync_status text,
  updated_at timestamptz not null default now(),
  check (target_low between 40 and 200),
  check (target_high between 100 and 400),
  check (target_low < target_high)
);

-- =============================================================
-- Leituras de glicemia (sensor ou manual)
-- =============================================================
create table public.glucose_readings (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  measured_at timestamptz not null,
  value_mgdl smallint not null check (value_mgdl between 20 and 600),
  -- Seta de tendência do Libre: 1 = caindo rápido … 5 = subindo rápido
  trend smallint check (trend between 1 and 5),
  source text not null default 'librelinkup' check (source in ('librelinkup', 'manual')),
  created_at timestamptz not null default now(),
  -- Evita duplicar leituras ao sincronizar várias vezes
  unique (user_id, measured_at)
);

-- =============================================================
-- Registros manuais
-- =============================================================
create table public.insulin_doses (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  taken_at timestamptz not null default now(),
  kind text not null check (kind in ('bolus', 'basal')),
  units numeric(5, 2) not null check (units > 0 and units <= 100),
  insulin_name text,
  note text,
  created_at timestamptz not null default now()
);

create table public.meals (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  eaten_at timestamptz not null default now(),
  carbs_g numeric(6, 1) not null check (carbs_g >= 0 and carbs_g <= 1000),
  meal_type text not null default 'outro'
    check (meal_type in ('cafe', 'almoco', 'lanche', 'jantar', 'ceia', 'outro')),
  description text,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  started_at timestamptz not null default now(),
  duration_min integer not null check (duration_min > 0 and duration_min <= 1440),
  kind text not null,
  intensity text not null default 'moderada'
    check (intensity in ('leve', 'moderada', 'intensa')),
  note text,
  created_at timestamptz not null default now()
);

create table public.notes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  noted_at timestamptz not null default now(),
  category text not null default 'outro'
    check (category in ('doenca', 'estresse', 'troca_sensor', 'hipo_tratada', 'outro')),
  body text not null,
  created_at timestamptz not null default now()
);

-- =============================================================
-- Índices para consultas por período
-- =============================================================
create index glucose_readings_user_time on public.glucose_readings (user_id, measured_at desc);
create index insulin_doses_user_time on public.insulin_doses (user_id, taken_at desc);
create index meals_user_time on public.meals (user_id, eaten_at desc);
create index exercises_user_time on public.exercises (user_id, started_at desc);
create index notes_user_time on public.notes (user_id, noted_at desc);

-- =============================================================
-- Row Level Security: cada usuário só enxerga e altera os próprios dados
-- =============================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'user_settings', 'glucose_readings', 'insulin_doses', 'meals', 'exercises', 'notes'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "dono acessa os próprios dados" on public.%I
         for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end;
$$;

-- =============================================================
-- Depois de rodar esta migration, cadastre o seu e-mail:
--   insert into public.allowed_emails (email) values ('voce@gmail.com');
-- =============================================================
