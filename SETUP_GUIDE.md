# CineScope Build Runbook - POC 31

The single authoritative guide for building, deploying, and publishing this
POC. Written for macOS (Apple Silicon) with VS Code; Fabric work happens
browser-first in the Fabric portal.

Workspace: **CineScope-TMDb-POC31** · Repo: **poc-31-cinescope-tmdb**
Fabric Apps (preview) is assumed already enabled in the tenant.

Phases are ordered. Each ends with a verification step; do not move on
until it passes.

-----

## Phase 0 - Prerequisites

| Requirement | Check |
|---|---|
| macOS with Xcode Command Line Tools | `xcode-select -p` prints a path |
| Node.js 18+ and npm 9+ | `node -v && npm -v` |
| Git | `git -v` |
| GitHub CLI | `gh --version` |
| VS Code | `code -v` |
| Fabric workspace access | Contributor or higher on CineScope-TMDb-POC31 |
| TMDB account | Created in Phase 4 |

Install anything missing:

```bash
xcode-select --install        # needed by node-gyp for the CLI's native keytar module
brew install node gh          # or use nvm if you manage Node versions
```

Why Xcode CLT matters: `@microsoft/rayfin-cli` depends on `keytar` (native
credential storage for `rayfin login`). Without the CLT, `npm install`
fails at node-gyp with a long stack trace.

-----

## Phase 1 - VS Code setup

1. Open the project: `File > Open Folder` on `poc-31-cinescope-tmdb`,
   or from a terminal:

   ```bash
   cd poc-31-cinescope-tmdb && code .
   ```

2. Install two extensions (Cmd+Shift+X):
   - **ESLint** (`dbaeumer.vscode-eslint`) - inline lint against `.eslintrc.cjs`
   - **GitHub Pull Requests** (`github.vscode-pull-request-github`) - optional,
     useful once the repo exists

3. TypeScript: use the workspace version so VS Code matches the build.
   Open any `.ts` file, Cmd+Shift+P, "TypeScript: Select TypeScript
   Version", choose "Use Workspace Version".

4. Do all terminal work in the integrated terminal (Ctrl+backtick) - the
   rest of this runbook assumes you are in the project root.

Note on decorators: this project deliberately does NOT set
`experimentalDecorators`. rayfin-core 1.33.x ships standard TC39 decorator
typings; the flag breaks compilation. If VS Code underlines `@entity()`,
you are on the built-in TS version instead of the workspace one - fix via
step 3.

-----

## Phase 2 - Install and first verification

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

## Phase 3 - GitHub via gh CLI

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

Three things must never reach GitHub: `rayfin/.env`, a TMDB key in any
notebook cell, raw TMDB data dumps. The `.gitignore` covers the first and
third; the notebook key check is manual and runs before every commit that
touches `notebooks/`.

Commit cadence for the rest of the build: commit at the end of each phase
with the phase name in the message. After Phase 5, also commit the
deployment state the CLI writes into `rayfin/rayfin.yml`.

-----

## Phase 4 - TMDB API key

1. Create an account: <https://www.themoviedb.org/signup>
2. Request a key: <https://www.themoviedb.org/settings/api> - choose
   **Developer**, accept the terms, describe the use as non-commercial
   analytics POC with attribution
3. Copy the **API Key (v3 auth)** string - the notebooks use v3 query-param
   auth, not the v4 read token
4. Store it in your password manager. It will be pasted into notebook
   config cells only, and cleared before commits

Obligations accepted with the key (already implemented in the app):

- The notice "This product uses the TMDB API but is not endorsed or
  certified by TMDB" renders in the app footer
- Stored data refreshed or deleted within 6 months - diarise the date of
  your Phase 7 ingestion run now

-----

## Phase 5 - Rayfin configure, login, deploy backend

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

4. Verify in the portal: the workspace now contains a Fabric App item.
   Open it and locate the **SQL endpoint** (server) and **database name** -
   Notebook 03 needs both. Confirm the five tables exist; note their exact
   generated names:

   ```sql
   SELECT name FROM sys.tables ORDER BY name;
   ```

5. Commit the state the CLI wrote into `rayfin/rayfin.yml`
   (rayfinItemId, fabricWorkspaceId, endpoint):

   ```bash
   git add rayfin/rayfin.yml && git commit -m "Phase 5: backend deployed, state recorded"
   git push
   ```

-----

## Phase 6 - Fabric workspace data setup

In the portal, inside CineScope-TMDb-POC31:

1. **Lakehouse**: New item > Lakehouse, name `cinescope_lake`
2. **Import notebooks**: Workspace > Import > Notebook, select the three
   files from `notebooks/` in this repo:
   - `01_ingest_tmdb_titles.ipynb`
   - `02_ingest_tmdb_credits.ipynb`
   - `03_build_aggregates_and_sync.ipynb`
3. Open each notebook and attach `cinescope_lake` as the **default
   lakehouse** (Explorer pane > Add lakehouse). The notebooks read and
   write Delta tables through it

-----

## Phase 7 - Run the notebooks

Run order is 01 then 02 then 03. Each subsection lists the cells you touch,
what the notebook does, and what good output looks like.

### Notebook 01 - ingest TMDB titles

You touch one cell:

- `TMDB_API_KEY = ""` - paste your key
- `VOTE_COUNT_MIN = 500`, `YEAR_FROM = 1950`, `YEAR_TO = 2026` - the agreed
  scope; leave unless deliberately re-scoping

What it does: pulls genre id-to-name maps, then pages
`/discover/movie` and `/discover/tv` year by year with
`vote_count.gte=500` (year slices keep every query far below the 500-page
API cap), normalises rows, writes the `raw_titles` Delta table as a full
overwrite.

Good output:

- The threshold evidence cell prints counts at vote_count 200 / 500 /
  1000 / 5000 - screenshot this for the blog, it is the scope-cut evidence
- Final cell prints `raw_titles written: N rows` with N roughly 12-18k
- Runtime: minutes

### Notebook 02 - ingest TMDB credits

You touch one cell:

- `TMDB_API_KEY = ""` - paste your key
- `TOP_CAST = 3`, `MAX_WORKERS = 8` - leave; 8 workers stays inside TMDB's
  rate ceiling with headroom

What it does: for every title in `raw_titles`, fetches credits - movies via
`/movie/{id}?append_to_response=credits` (credits and runtime in one call),
TV via `/tv/{id}/aggregate_credits`. Keeps directors plus top-3 billed
cast, appends to `raw_credits`, merges movie runtimes onto `raw_titles`.

Good output:

- Progress prints every 1,000 titles; failures stay near zero
- Final cell prints category counts (director and cast rows)
- Runtime: 10-20 minutes for ~15k API calls
- Idempotent: if the session dies, run it again - already-fetched titles
  are skipped via the `raw_credits` checkpoint

If you see repeated 429 responses in the output, lower `MAX_WORKERS` to 4.

### Notebook 03 - build aggregates and sync to Rayfin SQL

You touch one cell:

- `SQL_SERVER = ""` - the Fabric App item's SQL endpoint from Phase 5
- `SQL_DATABASE = ""` - the database name from Phase 5

What it does: computes Person career stats (vote-weighted), YearStat and
GenreYearStat aggregates; generates deterministic uuid5 primary keys from
natural keys so re-runs upsert instead of duplicating; connects with the
notebook's Entra identity (`notebookutils` token, pyodbc); bulk-upserts via
staged MERGE - parents (Title, Person) before children (Principal), stat
tables as full refresh.

Good output:

- Row counts printed per table after sync: Title 12-18k, Person 10-15k,
  Principal 50-70k, YearStat ~150, GenreYearStat 2-4k
- Runtime: minutes

Two known failure modes, both with documented fixes in the final markdown
cell:

- **Table names**: Rayfin generates the schema; if generated names differ
  from entity class names (pluralisation, schema prefix), adjust the
  `upsert` targets per your Phase 5 `sys.tables` check
- **pyodbc / ODBC driver**: the Fabric Spark runtime ships pyodbc and ODBC
  Driver 18. If `import pyodbc` fails on your runtime version, add a first
  cell: `%pip install pyodbc`

After all three: clear both API key cells, then:

```bash
git add notebooks/ && git commit -m "Phase 7: ingestion run complete, keys cleared" && git push
```

Diarise today + 6 months as the TMDB refresh/teardown date.

-----

## Phase 8 - Frontend: local verification, then deploy

Local first, against the live Fabric backend:

```bash
npx rayfin env        # writes the Vite env file from deployment state
npm run dev
```

Open <http://localhost:5173>. All four views should render with data.
If the error panel shows instead, check in order: `npx rayfin up status`,
Notebook 03 row counts, the generated `.env` file in the project.

One file owns all data access: `src/lib/client.ts`. If the preview query
builder surface changed since authoring (paging, predicate shape), that is
the only file to adjust - `fetchAll()` already degrades from paged to
unpaged reads automatically.

Then ship it:

```bash
npx rayfin up staticapp deploy
```

The CLI builds, packages `dist/` (~171KB gzipped, limit is 100MB), uploads,
and prints the hosting URL. Open it, sign in with your Entra identity.

-----
