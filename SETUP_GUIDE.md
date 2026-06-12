# CineScope Build Runbook - POC 31

The guide for building, deploying, and publishing this
POC. Fabric work happens
browser-first in the Fabric portal.

Workspace: **CineScope-TMDb-POC31** · Repo: **poc-31-cinescope-tmdb**
Fabric Apps (preview) is assumed already enabled in the tenant.

Phases are ordered. Each ends with a verification step.

-----

## Phase 1 - Install and first verification

```bash
npm install
npm run typecheck     # frontend project, expect no output
npx tsc -p rayfin/tsconfig.json   # entity project, expect no output
npm run lint          # expect clean
npm run build         # tsc + vite; expect dist/ around 600KB raw
```

All four must pass before anything touches GitHub or Fabric. They passed
at authoring time against `@microsoft/rayfin-core` 1.33.1; if a newer CLI
version breaks them, pin back to 1.33.x and note the drift for the blog.

-----

## Phase 2 - GitHub via gh CLI

One-time auth (browser flow):

```bash
gh auth login         # GitHub.com, HTTPS, authenticate via browser
gh auth status        # verify
```

Create and push the repo from the project root:

```bash
git init -b main
git add .
git status            # REVIEW THIS - see hygiene check below
git commit -m "POC 31 CineScope: initial artefacts"
gh repo create poc-31-cinescope-tmdb --public --source=. --push
```

Public, because the portfolio is the point. Use `--private` initially if
you prefer to flip visibility after first deploy.

**Hygiene check before that first commit - non-negotiable:**

```bash
git check-ignore rayfin/.env dist node_modules && echo "ignores OK"
git ls-files | grep -iE "\.env$|api_key|tmdb.*key" && echo "STOP - key tracked" || echo "no keys tracked"
grep -rn "TMDB_API_KEY = \"" notebooks/ | grep -v '= ""' && echo "STOP - key in notebook" || echo "notebooks clean"
```
-----

## Phase 3 - TMDB API key

1. Create an account: <https://www.themoviedb.org/signup>
2. Request a key: <https://www.themoviedb.org/settings/api> - accept the terms, describe the use as non-commercial
   analytics POC with attribution
3. Copy the **API Key** string. It will be pasted into notebook config cells only

Obligations accepted with the key (already implemented in the app):

- The notice "This product uses the TMDB API but is not endorsed or
  certified by TMDB" renders in the app footer
- Stored data refreshed or deleted within 6 months - diarise the date of
  your Phase 7 ingestion run now

-----

## Phase 4 - Rayfin configure, login, deploy backend

1. Configure:

   ```bash
   cp rayfin/.env.example rayfin/.env
   ```

   Edit `rayfin/.env` and set:

   ```
   FABRIC_AUTH_ENABLED=true
   ```

   This must be true before the first `npx rayfin up`. Entra SSO is the
   only auth method on deployed Fabric Apps; if left false the deployed
   app's auth breaks with no helpful error.

2. Create the Fabric workspace first (portal): New workspace, name
   `CineScope-TMDb-POC31`, your usual capacity. Rayfin deploys into an
   existing workspace; it does not create one.

3. Login and deploy from the VS Code terminal:

   ```bash
   npx rayfin login                                  # browser auth, token via keytar
   npx rayfin up --workspace CineScope-TMDb-POC31    # first deploy
   npx rayfin up status --json                       # verify
   ```

   `npx rayfin up` runs six steps: create item, get publishable key, sync
   rayfin.yml, apply schema, build and deploy static frontend, write
   deployment state back to rayfin.yml.

4. Apply the schema explicitly and verify it landed:

   ```bash
   npx rayfin up db apply --verbose
   ```

   Known trap (hit in the first build): the CLI compiles entities with
   `rayfin/tsconfig.json` but scans the hard-coded path
   `rayfin/.temp/compiled/` for the output. `outDir` must be
   `.temp/compiled` or every deploy reports success with an empty schema.
   This repo has the correct value; do not change it.

5. Collect Notebook 03's connection values in the portal. Open the App's
   child **SQL database** item > Settings > **Connection strings**:

   - `SQL_SERVER` = the Data Source host, `*.database.fabric.microsoft.com`,
     WITHOUT the `,1433`. This is the writable endpoint.
   - `SQL_DATABASE` = the Initial Catalog value VERBATIM. It carries a
     generated GUID suffix (`poc-31-cinescope-tmdb-3b4be5dd-...`);

   Confirm the tables in the database query editor:
   Titles, People, Principals, YearStats, GenreYearStats, plus the
   auth service's Users.

6. Commit the state CLI wrote into `rayfin/rayfin.yml`
   (rayfinItemId, fabricWorkspaceId, endpoint):

   ```bash
   git add rayfin/rayfin.yml && git commit -m "Phase 5: backend deployed, state recorded"
   git push
   ```

-----

## Phase 5 - Fabric workspace data setup

In the portal, inside CineScope-TMDb-POC31:

1. **Lakehouse**: New item > Lakehouse, name `cinescope_lake`
2. **Import notebooks**: Workspace > Import > Notebook, select the three
   files from `notebooks/` in this repo:
   - `01_ingest_tmdb_titles.ipynb`
   - `02_ingest_tmdb_credits.ipynb`
   - `03_build_aggregates_and_sync.ipynb`
3. Open each notebook and attach `cinescope_lake` as the **default
   lakehouse** (Explorer pane > Add lakehouse). The notebooks read and
   write Delta tables through it.

-----

## Phase 6 - Run the notebooks

Run order is 01 then 02 then 03. 

### Notebook 01 - ingest TMDB titles

You touch one cell:

- `TMDB_API_KEY = ""` - paste your key
- `VOTE_COUNT_MIN = 500`, `YEAR_FROM = 1950`, `YEAR_TO = 2026` 

What it does: pulls genre id-to-name maps, then pages
`/discover/movie` and `/discover/tv` year by year with
`vote_count.gte=500` (year slices keep every query far below the 500-page
API cap), normalises rows, writes the `raw_titles` Delta table as a full
overwrite.

### Notebook 02 - ingest TMDB credits

You touch one cell:

- `TMDB_API_KEY = ""` - paste your key
- `TOP_CAST = 3`, `MAX_WORKERS = 8` - leave; 8 workers stays inside TMDB's
  rate ceiling with headroom

What it does: for every title in `raw_titles`, fetches credits - movies via
`/movie/{id}?append_to_response=credits` (credits and runtime in one call),
TV via `/tv/{id}/aggregate_credits`. Keeps directors plus top-3 billed
cast, appends to `raw_credits`, merges movie runtimes onto `raw_titles`.

### Notebook 03 - build aggregates and sync to Rayfin SQL

You touch one cell:

- `SQL_SERVER = ""` - writable endpoint host, no port (the cell asserts
  you have not pasted the analytics endpoint)
- `SQL_DATABASE = ""` - the GUID-suffixed Initial Catalog, verbatim

Then Run All. What it does: computes Person career stats (vote-weighted),
YearStat and GenreYearStat aggregates; generates deterministic uuid5
primary keys; full-refresh loads all five tables with column types read from the
target tables.

After all three: clear both API key cells, then:

```bash
git add notebooks/ && git commit -m "Phase 6: ingestion run complete, keys cleared" && git push
```

Diarise today + 6 months as the TMDB refresh/teardown date.

-----

## Phase 7 - Frontend: local verification, then deploy

Local first, against the live Fabric backend:

```bash
npx rayfin env        # writes the Vite env file from deployment state
npm run dev
```

Open <http://localhost:5173>. All four views should render with data.
Then ship it:

```bash
npx rayfin up staticapp deploy
```

The CLI builds, packages `dist/` (~171KB gzipped, limit is 100MB), uploads,
and prints the hosting URL. Open it, sign in with your Entra identity.

-----
