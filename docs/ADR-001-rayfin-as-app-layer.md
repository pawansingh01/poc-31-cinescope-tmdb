# ADR-001: Rayfin as the application layer

- Status: Accepted
- Date: 2026-06-12
- POC: 31 (CineScope)

## Context

CineScope needs a SQL store, an API, authentication, and static hosting for
a React analytics frontend. The conventional Azure approach is App Service
(or Static Web Apps) plus Azure SQL plus an API layer plus Entra app
registrations - four services, each configured and governed separately,
all outside the Fabric estate where the analytical data already lives.

Rayfin (Fabric Apps, preview, announced Build 2026) provisions all four as
a single Fabric item from one CLI command, with the data model defined as
TypeScript decorator classes.

## Decision

Use Rayfin as the application layer. The entire backend - MSSQL database,
generated GraphQL API, Entra SSO, static hosting - is one Fabric App item
deployed with `npx rayfin up`.

## Consequences

Positive:

- The app lives inside Fabric governance: workspace permissions,
  item-level access, the same estate as the lakehouse feeding it
- One deploy command replaces four service configurations
- Schema, API, and client types stay in sync because all three are
  generated from the same entity classes
- Application data lands in the same OneLake-adjacent estate as the
  analytical tables

Negative / accepted risks:

- Preview software: CLI behaviour can drift from docs. This POC found the
  shipped decorator typings (standard TC39) contradict earlier preview
  guidance (`experimentalDecorators`) - the package is the truth
- No service principal login yet: deploys are interactive, CI/CD is a gap
- Generated API is CRUD-only: no aggregation pushdown; this POC routes
  group-by work to Fabric notebooks (see architecture.md)
- MSSQL is the only dialect; UUID-only primary keys; no many-to-many
  without explicit join entities

## Alternatives considered

- App Service + Azure SQL + custom API: full control, but creates an
  ungoverned application estate beside the governed data estate, and
  roughly triples the setup surface for a POC
- Power BI embedded / Fabric report: charts come cheap, but no custom
  interaction model (drill-down panels, client-side search), no custom
  data model, and nothing to say about application development on Fabric
- Static site + direct SQL endpoint queries: no auth story for a browser
  client, no API contract, rejected outright
