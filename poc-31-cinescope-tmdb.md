# POC 31 - CineScope: Claude Handoff Summary

## 1. What POC 31 Is

**Name:** CineScope
**Full title:** Film and TV Analytics on Microsoft Fabric with Rayfin,
powered by TMDB data
**Content pillar:** Fabric (primary), Application Architecture (secondary)
**GitHub repo name:** `poc-31-cinescope-tmdb`
**GitHub URL:** `https://github.com/pawansingh01/poc-31-cinescope-tmdb`
**Fabric workspace:** `CineScope-TMDb-POC31`

**POC purpose:** Demonstrate Rayfin as the governed application layer above
Fabric's analytical foundation. A read-only analytics app: TMDB film and
TV data ingested by Fabric notebooks, served from Rayfin SQL through the
generated GraphQL API, rendered by a React frontend on Rayfin static
hosting. One Fabric item, one deploy command.

-----

## 2. What Rayfin Is - Verified Essentials

Rayfin provisions a **Fabric App** item: SQL database (MSSQL only), Entra
ID auth, auto-generated GraphQL API, and static frontend hosting, deployed
via CLI. Preview - must be enabled per tenant by a Fabric administrator.

Facts verified in this POC against the shipped packages (v1.33.1):

- npm packages: `@microsoft/rayfin-core`, `@microsoft/rayfin-client`,
  `@microsoft/rayfin-cli`. There is NO `@microsoft/rayfin` meta package -
  it 404s. Scaffold initializer is `npm create @microsoft/rayfin@latest`
- Decorators are **standard TC39**, not legacy: `experimentalDecorators`
  must be OFF (it breaks compilation with TS1238/TS1240),
  `emitDecoratorMetadata` is not used, and `lib` must include
  `ESNext.Decorators` so `Symbol.metadata` resolves
- Relationship decorators take lazy thunks with **value imports**:
  `@one(() => Title)`. `import type` fails (TS1361) because the thunk
  runs at runtime
- Available field decorators: `@entity, @uuid, @text, @int, @decimal,
  @boolean, @date, @set, @email, @blob, @one, @many`, plus `@role` /
  `@authenticated` for permissions
- UUID primary key only; FKs by `{property}_id` naming convention;
  no many-to-many - explicit join entities required
- `optional: true` in the decorator makes the column nullable; the
  TypeScript `?` alone does not
- `@set()` is a closed enum - avoid for external vocabularies; use
  `@text()` with upstream normalisation
- `.js` extensions on relative imports inside `rayfin/data/` (ESM)
- Every entity must be registered in `rayfin/data/schema.ts` - missing
  registration silently drops it from the GraphQL API
- `FABRIC_AUTH_ENABLED=true` required in `rayfin/.env` before
  `npx rayfin up`, or deployed auth breaks with no helpful error
- `npx rayfin up` steps: create item, get publishable key, sync
  rayfin.yml, apply schema, build + deploy static frontend, write state
  back to rayfin.yml (commit that state)
- Static hosting: 100MB compressed limit (this build: ~171KB gzipped)
- Service principal login NOT supported - CI/CD gap, deploys interactive
- Targeted updates: `npx rayfin up db apply` (schema),
  `npx rayfin up staticapp deploy` (frontend), `npx rayfin env`
  (writes Vite env file)

**Official documentation:**

- Overview: <https://learn.microsoft.com/en-us/fabric/apps/overview>
- CLI reference: <https://learn.microsoft.com/en-us/fabric/apps/cli-reference>
- Project structure: <https://learn.microsoft.com/en-us/fabric/apps/project-structure>
- Deploy: <https://learn.microsoft.com/en-us/fabric/apps/deploy-app>
- SDK overview: <https://learn.microsoft.com/javascript/api/fabric-apps-sdk-javascript/rayfin-overview>

-----

## 3. Data Source - TMDB

- TMDB API, free for non-commercial use with attribution
- Mandatory notice, rendered in the app footer and present in README and
  repo metadata: "This product uses the TMDB API but is not endorsed or
  certified by TMDB."
- Caching cap: stored TMDB data must be refreshed or deleted within
  6 months - diarise from the ingestion run date
- Images hotlinked from `https://image.tmdb.org/t/p/{size}{path}` -
  allowed with attribution
- API key: free Developer registration; lives only in notebook config
  cells, cleared before every commit; never in frontend code
- Why not IMDb datasets: licence grey area for professionally published
  portfolio content, no-redistribution constraint. Full rationale in
  docs/ADR-002

**Scope cut (agreed with PK):** movies + TV, `vote_count >= 500`,
released 1950 onwards. Roughly 12-18k titles, 50-70k credit rows,
10-15k people. Directors plus top-3 billed cast per title.

-----

## 4. Architecture - Three Layers

```
LAYER 1 - INGESTION (one-shot bulk, refresh within 6 months)
TMDB API -> Notebook 01 (discover by year) -> raw_titles Delta
         -> Notebook 02 (credits, threaded, idempotent) -> raw_credits Delta
         -> Notebook 03 (aggregates + pyodbc staged MERGE) -> Rayfin SQL

LAYER 2 - DATA MODEL (Rayfin)
Entities: Title, Person, Principal (join), YearStat, GenreYearStat
Aggregates precomputed in notebooks - the generated API is CRUD only
Deterministic uuid5 ids from natural keys (tmdbKey, statKey) so re-runs upsert

LAYER 3 - FRONTEND (Rayfin Static Hosting)
React 18 + Vite + TypeScript + Recharts
Views: Ratings & Trends | Genre Analysis | People Analytics | Search & Explore
One-shot slim-projection load; client-side explore; equality-only
on-demand queries (Principal by title_id / person_id)
```
-----

## 5. Complete File Reference

```
poc-31-cinescope-tmdb/
├── poc-31-cinescope-tmdb.md         this file
├── README.md                        overview, decisions, gotchas
├── SETUP_GUIDE.md                   Phases 0-9 + troubleshooting table
├── .gitignore                       excludes rayfin/.env, dist, keys, raw data
├── .eslintrc.cjs                    lint config
├── package.json                     verified package names, rayfin:* scripts
├── tsconfig.json                    NO experimentalDecorators; ESNext.Decorators lib
├── index.html / vite.config.ts      Vite shell
├── rayfin/
│   ├── rayfin.yml                   auth (password local, fabric SSO deployed),
│   │                                data (mssql), staticHosting enabled
│   ├── tsconfig.json                entity compilation config
│   ├── .env.example                 FABRIC_AUTH_ENABLED documentation
│   └── data/
│       ├── Title.ts  Person.ts  Principal.ts  YearStat.ts  GenreYearStat.ts
│       └── schema.ts                entity registry - ALL entities registered
├── src/
│   ├── main.tsx  App.tsx  styles.css  types.ts  vite-env.d.ts
│   ├── lib/client.ts                RayfinClient + fetchAll/fetchWhere + tmdbImage
│   ├── hooks/useCineData.ts         one-shot data load + caches
│   └── components/
│       ├── RatingsTrends.tsx  GenreAnalysis.tsx
│       ├── PeopleAnalytics.tsx  SearchExplore.tsx
├── notebooks/
│   ├── 01_ingest_tmdb_titles.ipynb
│   ├── 02_ingest_tmdb_credits.ipynb
│   └── 03_build_aggregates_and_sync.ipynb
└── docs/
    ├── architecture.md
    ├── ADR-001-rayfin-as-app-layer.md
    ├── ADR-002-tmdb-as-data-source.md
    └── blog-post-skeleton.md
```

-----

## 6. Verification Status (as of 2026-06-12)

Verified by compilation and build:

- Entities compile against `@microsoft/rayfin-core` 1.33.1 (tsc clean)
- Frontend typechecks (tsc clean) and builds (Vite, ~171KB gzipped)
- All three notebooks are valid JSON
- Package names confirmed against the npm registry

NOT yet verified (requires PK's Fabric tenant):

- `npx rayfin up` end to end; actual generated SQL table names
  (Notebook 03 has a documented sys.tables check and adjustable targets)
- The preview query builder surface at runtime - `fetchAll()` in
  src/lib/client.ts probes take/skip and degrades to unpaged; if the
  client surface shifted, that one file is the place to adjust
- TMDB row counts at the agreed threshold (Notebook 01 prints evidence)

-----

## 7. Decisions Already Made - Do Not Revisit Without PK's Input

| Decision | What was decided | Reason |
|---|---|---|
| Data source | TMDB API, not IMDb datasets | Licence clean for attributed non-commercial; images included |
| Scope | Movies+TV, vote_count >= 500, 1950+ | Bounded, rich enough, evidenced at ingestion |
| Ingestion | Fabric notebooks, /discover pagination by year | Fewest API calls; full objects per page |
| Bulk load | pyodbc staged MERGE, not GraphQL mutations | Minutes not hours at 50k+ rows |
| Aggregates | Precomputed (YearStat, GenreYearStat) in Notebook 03 | Generated API is CRUD; group-by belongs upstream |
| Genres | Comma-separated string on Title | Display/filter field; charts read GenreYearStat |
| Keys | @text natural keys + deterministic uuid5 PKs | Idempotent re-runs |
| Images | Hotlink TMDB CDN | Allowed with attribution; storage service stays off |
| Frontend reads | One-shot slim load + client-side explore | Surface under 10MB; equality-only on-demand queries |
| Workspace name | CineScope-TMDb-POC31 | PK confirmed |
| Repo name | poc-31-cinescope-tmdb | PK confirmed |

-----