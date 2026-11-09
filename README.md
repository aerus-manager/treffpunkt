# Treffpunkt

Eget nettprosjekt. Ikke en endring i den originale Flutter-appen.

Skytedagbok med NSF-programmene (luftpistol og fin/grov) med helringscoring, og IPSC som egen kategori: treff på skive, tid og hit factor.

## Funksjoner

- **NSF-programmer**: sett skuddene på skiva (trykk og dra for å finjustere, verdien vises mens du drar), eller tast ringverdien direkte. Zoom på det svarte, nedtelling for tidsserier, angre også forrige serie.
- **IPSC-driller**: innebygde driller og egne driller, minor/major, stål, no-shoot og prosedyrefeil, Comstock-telling.
- **Flere skyttere** på samme enhet, hver med egne økter, driller og persrekorder.
- **Sikkerhetskopi**: last ned / les inn hele dagboken som JSON (slår sammen, sletter ingenting).
- **Virker uten nett** (service worker), kan legges på hjemskjermen, holder skjermen våken under skyting.
- Nettleserens tilbake-knapp virker, og hver skjerm har egen adresse (`#/skyt/<id>` osv.).

## Lagring

Dagboken lagres i IndexedDB i nettleseren (ingen 5 MB-grense som localStorage). Data fra eldre utgaver (localStorage-nøklene `treffpunkt-dagbok` og `faktor-logg`) flyttes over automatisk første gang.

Synk mellom enheter krever Supabase og er ikke skrudd på, se `SUPABASE-JOBB.md`.

## Utvikling

```bash
npm install
npm run dev        # http://localhost:8080
npm test           # poengregning, øktflyt og ruting
npm run lint
npm run build      # typesjekk + produksjonsbygg til dist/
```

Ren Vite + React-app uten server. `dist/` kan legges på hvilken som helst statisk vert; `vercel.json` er satt opp for Vercel.

Lisens: GPL-3.0-or-later.
