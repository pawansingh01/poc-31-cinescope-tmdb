# CineScope Architecture - POC 31

Film and TV analytics on Microsoft Fabric with Rayfin (Fabric Apps, preview).
This document is the architecture narrative; decision rationale is in the
README's design-decisions table.

## Component view

```
+--------------------------------------------------------------+
| MICROSOFT FABRIC WORKSPACE: CineScope-TMDb-POC31              |
|                                                               |
|  +----------------+      +----------------------------------+ |
|  | Lakehouse      |      | Fabric App item (Rayfin)         | |
|  | cinescope_lake |      |                                  | |
|  |                |      |  SQL database (MSSQL)            | |
|  | raw_titles     |----->|   Title, Person, Principal,      | |
|  | raw_credits    | NB03 |   YearStat, GenreYearStat        | |
|  +----------------+      |                                  | |
|        ^                 |  GraphQL API (generated)         | |
|        | NB01, NB02      |        ^                         | |
|        |                 |        |                         | |
|  +----------------+      |  Static hosting (React app) -----+-+--> browser
|  | Notebooks      |      |  Entra SSO (Fabric brokered)     | |
|  +----------------+      +----------------------------------+ |
|        ^                                                      |
+--------+-----------------------------------------------------+
         |
   TMDB API (/genre, /discover, /movie, /tv)
```

## Layers

### Layer 1 - Ingestion (Fabric notebooks)

- Notebook 01 pulls in-scope titles from TMDB `/discover/movie` and
  `/discover/tv`, sliced by year to stay under the 500-page cap per query.
  Output: `raw_titles` Delta table. The notebook prints title counts at
  several vote thresholds so the scope cut is evidenced, not asserted.
- Notebook 02 fetches credits per title (movies:
  `/movie/{id}?append_to_response=credits`, one call covers credits and
  runtime; TV: `/tv/{id}/aggregate_credits`). Directors plus top-3 billed
  cast are kept. Output: `raw_credits` Delta table. Idempotent - re-runs
  resume from where they stopped.
- Notebook 03 computes Person career stats, YearStat, and GenreYearStat,
  generates deterministic uuid5 primary keys from natural keys, and
  bulk-upserts all five tables into the Rayfin SQL database over pyodbc
  (staged MERGE, parents before children).

One-shot bulk load, not micro-batch: TMDB reference data is static at this
granularity. The TMDB caching terms set the refresh obligation - stored
data is refreshed or deleted within 6 months.

### Layer 2 - Data model (Rayfin)

Five entities in `rayfin/data/`, compiled by the Rayfin CLI into SQL
schema, GraphQL endpoints, and a type-safe client:

- `Title` - one row per in-scope movie or TV series
- `Person` - directors and top-billed cast, career stats precomputed
- `Principal` - explicit Title-Person join entity (Rayfin has no
  many-to-many); FKs follow the `{property}_id` convention
- `YearStat`, `GenreYearStat` - pre-aggregated chart tables

Aggregation lives in the notebook layer, not the API and not the frontend.
Rayfin's generated GraphQL API is a CRUD API; group-by belongs upstream.

### Layer 3 - Frontend (Rayfin static hosting)

React 18 + Vite + TypeScript + Recharts, served from the same Fabric App
item. Data access pattern:

- One-shot load of slim projections at startup (Title, Person, YearStat,
  GenreYearStat) - the full analytical surface is under 10MB
- Client-side filtering and sorting for Search & Explore
- On-demand equality queries only for Principal (by `title_id` or
  `person_id`), the predicate shape the preview API reliably supports
- `fetchAll()` degrades from paged (take/skip) to unpaged reads when the
  preview client lacks paging methods

Views: Ratings & Trends, Genre Analysis, People Analytics, Search & Explore.
The TMDB attribution notice renders in the footer of every view.

## Data flow sequence

1. `npx rayfin up` creates the Fabric App item: SQL database with the five
   tables, GraphQL API, static hosting slot, Entra SSO wiring
2. Notebooks 01-03 run in the workspace; Rayfin SQL is populated
3. Browser loads the React app from static hosting, authenticates via
   Fabric SSO, and queries the GraphQL API
4. Refresh: re-run notebooks within 6 months, or tear down

## Security model

- Deployed auth is Fabric brokered Entra SSO only (`fabric.enabled: true`)
- Read-only app: no write-back, no user-generated data, no storage service
- The TMDB API key exists only in notebook config cells (cleared before
  commit) - never in frontend code, never in the repo
- The publishable key in the frontend is, by design, publishable

## Sizing

| Table | Rows (approx) |
|---|---|
| Title | 12-18k |
| Person | 10-15k |
| Principal | 50-70k |
| YearStat | ~150 |
| GenreYearStat | 2-4k |

Frontend bundle: ~600KB raw, ~171KB gzipped - far under the 100MB static
hosting limit.
