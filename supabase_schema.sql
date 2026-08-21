-- MyTask — schema Supabase
-- Da eseguire una volta nell'SQL editor del progetto Supabase (edlvmkjctzhqoswpppds).
-- Convenzione di naming per questo progetto: tutte le tabelle iniziano con TASK_.

-- Estensione per crypto.randomUUID lato DB (non strettamente necessaria perché
-- gli ID vengono generati lato client, ma utile come default di sicurezza).
create extension if not exists "pgcrypto";

create table if not exists public."Task_items" (
  id          uuid primary key,                          -- generato lato client con crypto.randomUUID()
  user_id     uuid not null references auth.users(id) on delete cascade,
  parent_id   uuid references public."Task_items"(id) on delete cascade,  -- null = task principale, valorizzato = sottotask
  title       text not null,
  notes       text,
  chi         text,                                       -- solo sui sottotask: 'M' | 'C' | 'M+C'
  done        boolean not null default false,
  position    integer not null default 0,                -- ordinamento manuale dei sottotask senza data
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Se la tabella esiste già da prima (creata senza la colonna "chi"):
alter table public."Task_items" add column if not exists chi text;

-- Indici utili
create index if not exists task_items_user_id_idx on public."Task_items" (user_id);
create index if not exists task_items_parent_id_idx on public."Task_items" (parent_id);

-- Row Level Security: ogni utente vede/modifica solo i propri task
alter table public."Task_items" enable row level security;

create policy "task_items_select_own" on public."Task_items"
  for select using (auth.uid() = user_id);

create policy "task_items_insert_own" on public."Task_items"
  for insert with check (auth.uid() = user_id);

create policy "task_items_update_own" on public."Task_items"
  for update using (auth.uid() = user_id);

create policy "task_items_delete_own" on public."Task_items"
  for delete using (auth.uid() = user_id);

-- Trigger per aggiornare updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists task_items_set_updated_at on public."Task_items";
create trigger task_items_set_updated_at
  before update on public."Task_items"
  for each row execute function public.set_updated_at();
