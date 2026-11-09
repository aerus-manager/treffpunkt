# Supabase-jobb til grokbot

Dette gjelder nett-dagboken Treffpunkt, ikke Roy sin Flutter-app.

Supabase kan ikke kobles som en tjeneste fra appen. Det ligger heller ingen nøkkel i post@aerus.no.

Gjør dette på grokbot sin Supabase-konto:

1. Opprett et prosjekt, eller bruk det som allerede er opprettet.
2. Kjør denne SQL-en i SQL editor:

```sql
create table if not exists public.treffpunkt_diary (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists treffpunkt_diary_user_updated
  on public.treffpunkt_diary (user_id, updated_at);
alter table public.treffpunkt_diary enable row level security;
-- Hver bruker ser og endrer bare sine egne rader.
create policy treffpunkt_owner on public.treffpunkt_diary
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

Merk: Den første versjonen av denne SQL-en brukte `auth.uid() is not null`. Det lar alle innloggede brukere lese og overskrive hverandres dagbøker. Har den allerede blitt kjørt, slett den gamle policyen (`drop policy treffpunkt_owner on public.treffpunkt_diary;`), legg til `user_id`-kolonnen og kjør policyen over på nytt.

3. Svar med prosjekt-URL (https://xxxx.supabase.co) og anon public key.

Ikke send service_role-nøkkelen. Den skal ikke i appen.

Når nøklene er klare, kobles synk på økter, felt og IPSC. Inntil da ligger dagboken på enheten.
