# CineScope - Film and TV Analytics on Microsoft Fabric with Rayfin

**POC 31** in the Microsoft Fabric MVP portfolio.
From TMDB open data to a governed analytics app, deployed as a single Fabric item.

> This product uses the TMDB API but is not endorsed or certified by
> [TMDB](https://www.themoviedb.org). All film and TV data and images are
> supplied by TMDB. Per TMDB caching terms, stored data is refreshed or
> deleted within 6 months.

## What this POC demonstrates

- Rayfin (Fabric Apps, preview) as the governed application layer above Fabric's analytical foundation
- A TypeScript-decorator data model compiled into SQL schema, GraphQL API, and a type-safe client
- Fabric notebooks as the ingestion and aggregation layer, bulk-loading into Rayfin SQL
- A React analytics frontend served from Rayfin static hosting, same Fabric item, one deploy command

## Architecture

```
LAYER 1 - INGESTION (one-shot bulk, refresh within 6 months)
TMDB API (/discover, /credits; free key, ~40 req/s)
|  Notebook 01: discover titles by year -> raw_titles Delta
|  Notebook 02: credits + runtimes      -> raw_credits Delta
|  Notebook 03: aggregates + bulk upsert -> Rayfin SQL

LAYER 2 - DATA MODEL (Rayfin)
TypeScript entities: Title, Person, Principal, YearStat, GenreYearStat
Auto-generated GraphQL API - frontend queries this endpoint
Fabric workspace: CineScope-TMDb-POC31

LAYER 3 - FRONTEND (Rayfin Static Hosting)
React 18 + Vite + TypeScript + Recharts
Views: Ratings & Trends | Genre Analysis | People Analytics | Search & Explore
```

## Data scope

- Movies and TV series, `vote_count >= 500`, released 1950 onwards
- Roughly 12-18k titles, 50-70k credit rows, 10-15k people
- Directors plus top-3 billed cast per title
- Scope is evidenced at ingestion time: Notebook 01 prints title counts at several vote thresholds

## Entities

| Entity | Rows (approx) | Purpose |
|---|---|---|
| Title | 12-18k | One row per in-scope movie or TV series |
| Person | 10-15k | Directors and top-billed cast, career stats precomputed |
| Principal | 50-70k | Explicit Title-Person join (Rayfin has no many-to-many) |
| YearStat | ~150 | Per (year, mediaType) aggregates for trend charts |
| GenreYearStat | 2-4k | Per (genre, year, mediaType) aggregates |

## Key design decisions

| Decision | What was decided | Reason |
|---|---|---|
| Data source | TMDB API, not IMDb datasets | TMDB terms are clean for attributed non-commercial use; IMDb non-commercial licence is greyer and prohibits redistribution. Bonus: poster and profile images |
| Ingestion | One-shot Fabric notebooks | Static reference data; micro-batch not needed. Notebooks own ingestion and aggregation; Rayfin SQL stays a serving store |
| Bulk load path | Direct SQL (pyodbc MERGE), not GraphQL mutations | 50k+ rows through GraphQL would take hours; SQL takes minutes. Application reads still use GraphQL |
| Aggregates | Precomputed in Notebook 03 (YearStat, GenreYearStat) | Rayfin's generated API is CRUD; group-by belongs in the notebook layer |
| Genres | Comma-separated string on Title | Avoids join-entity sprawl for a display/filter field. Charting never splits the column - it reads GenreYearStat |
| Unique keys | @text natural keys (tmdbKey, statKey) + deterministic uuid5 ids | Re-running Notebook 03 upserts instead of duplicating; UUID PKs are a Rayfin requirement |
| Status-like fields | @text() not @set() | TMDB vocabularies (genres, departments) are external and not stable closed enums |
| Frontend reads | One-shot load of slim projections, client-side filtering | Whole analytical surface is under 10MB; only Principal is queried on demand (equality predicates only) |

## Known constraints and gotchas

- Rayfin is in preview; the query builder surface may shift between CLI versions. `fetchAll()` in `src/lib/client.ts` degrades from paged to unpaged reads automatically
- **Decorators (verified against rayfin-core 1.33.1, diverges from some preview docs):** the package ships standard TC39 decorator typings. `experimentalDecorators` must be OFF (it breaks compilation), `lib` needs `ESNext.Decorators` for `Symbol.metadata`, and relationship thunks use plain value imports: `@one(() => Title)` - `import type` does not work because the thunk runs at runtime
- **Packages (verified against the npm registry):** there is no `@microsoft/rayfin` meta package. Depend on `@microsoft/rayfin-core`, `@microsoft/rayfin-client`, and `@microsoft/rayfin-cli` individually
- Every entity must be registered in `rayfin/data/schema.ts` or it silently misses the GraphQL API
- `FABRIC_AUTH_ENABLED=true` must be set in `rayfin/.env` before the first `npx rayfin up`
- `optional: true` in the decorator makes a column nullable; the TypeScript `?` alone does not
- Notebook 03 targets the generated SQL tables directly; if Rayfin's generated names differ from entity names, adjust the upsert targets (query `sys.tables`)
- TMDB `popularity` is recalculated daily by TMDB; treat it as a snapshot metric, it is labelled as such in the UI
- Service principal login is not supported by the Rayfin CLI yet; deploys are interactive

## Getting started

See [SETUP_GUIDE.md](SETUP_GUIDE.md). Short version:

```bash
npm install
npx rayfin login
npx rayfin up                  # creates the Fabric App item + database
# run notebooks 01 -> 02 -> 03 in the Fabric workspace
npx rayfin env                 # write Vite env from deployment state
npm run dev                    # local frontend against the Fabric backend
npx rayfin up staticapp deploy # ship the frontend
```

## Repository

`https://github.com/pawansingh01/poc-31-cinescope-tmdb`

All code, notebooks, and configuration are committed. `rayfin/.env` and any
file containing a TMDB API key are excluded and must stay excluded.

## Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - phased build and deploy guide
- [docs/architecture.md](docs/architecture.md) - architecture narrative and data flow
- [docs/ADR-001-rayfin-as-app-layer.md](docs/ADR-001-rayfin-as-app-layer.md) - why Rayfin over a conventional app stack
- [docs/ADR-002-tmdb-as-data-source.md](docs/ADR-002-tmdb-as-data-source.md) - why TMDB over IMDb datasets
