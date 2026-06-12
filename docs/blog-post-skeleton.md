# Blog post skeleton - Tech Community article

**Working title:** Building a Film Analytics App on Microsoft Fabric with
Rayfin - From TMDB Open Data to a Governed Analytics Frontend

**Content pillar:** Fabric (primary), Application Architecture (secondary)
**POC:** 31 - CineScope
**Repo:** poc-31-cinescope-tmdb

Target length: 1,800-2,400 words. Screenshots marked [SCREENSHOT].

---

## 1. Hook

- The gap Rayfin fills: Fabric owns the data estate, but custom app
  frontends have always lived outside it - separate hosting, separate
  auth, separate governance
- One sentence on what gets built: a film and TV analytics app, deployed
  as a single Fabric item, fed by Fabric notebooks
- [SCREENSHOT: Ratings & Trends view, full window]

## 2. What Rayfin is (brief, for Fabric readers)

- Fabric Apps preview: SQL database + generated GraphQL API + Entra SSO +
  static hosting as one Fabric item
- TypeScript decorator classes are the single source of truth: schema,
  API, and client types all generated from them
- `npm create @microsoft/rayfin@latest` to scaffold, `npx rayfin up` to ship
- Keep this section tight - link to the docs, not a tutorial rehash

## 3. The build

### 3.1 Data source and scope

- TMDB API, free non-commercial with attribution; why not IMDb (one
  paragraph, licence grey area - link ADR-002 in the repo)
- Scope cut: vote_count >= 500, 1950 onwards, movies + TV, evidenced by
  threshold counts printed at ingestion
- The 6-month caching obligation and what it means for the deployment

### 3.2 Data model

- Five entities; show Title and Principal as code listings
- Call out: UUID-only PKs, `{property}_id` FK convention, explicit join
  entity instead of many-to-many, @text over @set for external vocabularies
- Aggregates (YearStat, GenreYearStat) precomputed in notebooks because
  the generated API is CRUD - this is the key architectural point

### 3.3 Ingestion notebooks

- 01 discover titles (year-sliced pagination), 02 credits (threaded,
  idempotent), 03 aggregates + pyodbc staged MERGE into Rayfin SQL
- Why bulk load over SQL and not GraphQL mutations (hours vs minutes)
- [SCREENSHOT: notebook 01 threshold-count output]

### 3.4 Frontend

- React + Vite + Recharts on Rayfin static hosting
- One-shot slim-projection load, client-side explore, equality-only
  on-demand queries
- [SCREENSHOT: Genre Analysis] [SCREENSHOT: People Analytics drill-down]
- [SCREENSHOT: Search & Explore with detail panel and TMDB footer notice]

## 4. What I hit in preview (the honest section)

This is the section readers will bookmark. Verified findings, not vibes:

- No `@microsoft/rayfin` meta package on npm - depend on rayfin-core,
  rayfin-client, rayfin-cli individually
- rayfin-core 1.33.x ships standard TC39 decorator typings:
  `experimentalDecorators` breaks the build, `lib` needs
  `ESNext.Decorators`, relationship thunks need value imports
- Entities silently missing from the API when not registered in schema.ts
- `FABRIC_AUTH_ENABLED` must be true before first deploy or auth breaks
  with no useful error
- No service principal login yet - CI/CD gap
- Generated table names may differ from entity names - check sys.tables
  before writing sync code

## 5. Verdict and what's next

- Where Rayfin fits today: POCs, internal tools, data exploration apps
  inside a governed estate
- Where it does not fit yet: CI/CD pipelines, aggregation-heavy APIs,
  anything needing non-MSSQL
- Future: scheduled refresh pipeline, write-back scenario with @role
  policies, Fabric IQ agent over the curated dataset

## 6. Footer

- Repo link, setup guide link
- TMDB attribution notice (mandatory): "This product uses the TMDB API
  but is not endorsed or certified by TMDB."

---

Checklist before publishing:

- [ ] All screenshots show the TMDB footer notice where visible
- [ ] No API key visible in any screenshot or code listing
- [ ] Notebook key cells cleared in the committed repo
- [ ] Refresh/teardown date diarised (6 months from ingestion run)
