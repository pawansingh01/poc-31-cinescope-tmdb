// Title.ts - POC 31: CineScope Film and TV Analytics
// One row per movie or TV series in scope.
// Scope cut: movies and TV with vote_count >= 500, first release 1950 onwards.
// Roughly 12-18k rows. Loaded once by Notebook 03.
//
// Source: TMDB API /discover/movie and /discover/tv.
// This product uses the TMDB API but is not endorsed or certified by TMDB.
// TMDB caching terms: stored data must be refreshed or deleted within 6 months.
//
// NOTE: Use relative imports with .js extensions - required for ESM resolution.

import { entity, uuid, text, int, decimal, boolean, many } from '@microsoft/rayfin-core';
// Value import (not `import type`): the @many thunk references the class
// at runtime. The () => lazy form keeps the circular Title/Principal
// reference safe under ESM.
import { Principal } from './Principal.js';

@entity()
export class Title {
  @uuid()
  id!: string;

  // TMDB numeric id stored as text - e.g. "278" (The Shawshank Redemption).
  // Stored as @text natural key: a stable upsert anchor alongside the
  // UUID primary key. Combined with mediaType for uniqueness as TMDB
  // movie and TV ids are separate sequences: "movie-278", "tv-1396".
  // UUID id is generated deterministically from this key (uuid5) in
  // Notebook 03 so repeated loads upsert instead of duplicating.
  @text({ unique: true, max: 20 })
  tmdbKey!: string;

  // "movie" or "tv".
  // @text() not @set(): scope may widen and TMDB vocabulary is external.
  @text({ max: 10 })
  mediaType!: string;

  // Display title - e.g. "The Shawshank Redemption"
  @text({ max: 500 })
  title!: string;

  // Release year (movies) or first air year (TV)
  @int()
  releaseYear!: number;

  // Decade bucket precomputed in Notebook 03 - e.g. 1990 for 1994.
  // Avoids client-side bucketing for the decade bar chart.
  @int()
  decade!: number;

  // Movie runtime in minutes. Null for TV (episode runtimes vary) and
  // for movies where TMDB has no runtime recorded.
  @int({ optional: true })
  runtimeMinutes?: number;

  // Comma-separated genre names - e.g. "Drama,Crime".
  // Mapped from TMDB genre_ids in Notebook 01 via /genre/{type}/list.
  // A comma-separated string avoids many-to-many join complexity for
  // POC scope (Rayfin would need a join entity). Genre aggregation
  // is precomputed in GenreYearStat, so the frontend only splits this
  // column for display and filtering, never for charting.
  @text({ max: 200 })
  genres!: string;

  // TMDB mean user score, one decimal place, 0-10 scale - e.g. 8.7
  @decimal()
  voteAverage!: number;

  // Vote count at ingestion time
  @int()
  voteCount!: number;

  // TMDB popularity score at ingestion time. Relative, recalculated daily
  // by TMDB; treat as a snapshot, not a stable metric.
  @decimal()
  popularity!: number;

  // TMDB poster path - e.g. "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg".
  // Hotlinked by the frontend as https://image.tmdb.org/t/p/w185{posterPath}.
  // Null where TMDB has no poster.
  @text({ optional: true, max: 100 })
  posterPath?: string;

  // ISO 639-1 original language - e.g. "en", "ko". Frontend filter facet.
  @text({ max: 10 })
  originalLanguage!: string;

  // True for TV. Convenience flag for frontend filters.
  @boolean({ default: false })
  isSeries!: boolean;

  // Navigation: one Title -> many Principals (directors and top-billed cast)
  @many(() => Principal)
  principals?: Principal[];
}
