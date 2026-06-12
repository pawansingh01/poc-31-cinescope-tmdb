# ADR-002: TMDB as the data source

- Status: Accepted
- Date: 2026-06-12
- POC: 31 (CineScope)

## Context

The POC needs a rich, recognisable film and TV dataset: titles, ratings,
genres, people, credits. Two realistic candidates:

- IMDb non-commercial datasets: bulk TSV downloads, very recognisable, but
  the licence is restrictive - non-commercial only, no redistribution, and
  the boundary is grey for content published under a professional profile
  (blog articles, portfolio work)
- TMDB API: free for non-commercial use with attribution, explicit and
  simple conditions, bulk-friendly endpoints, and image hotlinking allowed

A third option, MovieLens, has clean licensing but weak public recognition
and no imagery.

## Decision

Use the TMDB API. Conditions accepted and implemented:

- The notice "This product uses the TMDB API but is not endorsed or
  certified by TMDB" renders prominently in the app footer and appears in
  the README and repo metadata
- Stored data is refreshed or deleted within 6 months (TMDB caching cap);
  the obligation is documented in the README and setup guide
- The API key is free, registered as Developer / non-commercial

## Consequences

Positive:

- Licence position is clean for a published, attributed, non-commercial POC
- Poster and profile imagery via TMDB CDN paths - materially better
  frontend and blog screenshots, allowed with attribution
- `/discover` returns full title objects (votes, genres, poster, language)
  20 per page, so titles need no per-id calls; credits embed person
  metadata, so people need no per-id calls either

Negative / accepted risks:

- Ratings are TMDB community scores, not IMDb ratings - smaller voter base,
  different distribution; charts are labelled as TMDB scores
- `popularity` is recalculated daily by TMDB and is only a snapshot metric;
  the UI labels it as such
- API-based ingestion (roughly 15k calls for credits) instead of file
  downloads - mitigated with threading, retry on 429, and an idempotent
  checkpoint so re-runs resume
- The 6-month cap makes the deployment intentionally perishable; a refresh
  or teardown date must be diarised

## Alternatives considered

- IMDb datasets: rejected on licence grey area for professionally published
  portfolio content and the no-redistribution constraint (raw TSVs could
  never sit in the repo or lakehouse shared beyond the tenant)
- MovieLens: clean licence, weak narrative value, no imagery
- Synthetic data: zero licence risk, zero credibility in screenshots
