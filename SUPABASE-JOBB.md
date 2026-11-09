# Supabase-jobb til grokbot

Dette gjelder nett-dagboken Treffpunkt, ikke Roy sin Flutter-app.

Supabase kan ikke kobles som en tjeneste fra appen. Det ligger heller ingen nøkkel i post@aerus.no.

Gjør dette på grokbot sin Supabase-konto:

1. Opprett et prosjekt, eller bruk det som allerede er opprettet.
2. Kjør denne SQL-en i SQL editor:

```sql
create table if not exists public.treffpunkt_diary (
  id text primary key,
  kind text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.treffpunkt_diary enable row level security;
create policy treffpunkt_owner on public.treffpunkt_diary
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
```

3. Svar med prosjekt-URL (https://xxxx.supabase.co) og anon public key.

Ikke send service_role-nøkkelen. Den skal ikke i appen.

Når nøklene er klare, kobles synk på økter, felt og IPSC. Inntil da ligger dagboken på enheten.
