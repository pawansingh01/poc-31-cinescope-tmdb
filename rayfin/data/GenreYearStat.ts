// GenreYearStat.ts - POC 31: CineScope Film and TV Analytics
// Pre-aggregated per-genre, per-year statistics.
// One row per (genre, year, mediaType) with at least one in-scope title.
// Roughly 2-4k rows. Computed by Notebook 03.
//
// A title with genres "Drama,Crime" contributes to both the Drama and
// Crime rows for its year. Genre rows therefore do not sum to YearStat
// counts - the frontend never adds them across genres.

import { entity, uuid, text, int, decimal } from '@microsoft/rayfin-core';

@entity()
export class GenreYearStat {
  @uuid()
  id!: string;

  // Upsert key - e.g. "Drama-1994-movie". UUID derived from it (uuid5).
  @text({ unique: true, max: 60 })
  statKey!: string;

  // TMDB genre name - e.g. "Drama", "Science Fiction"
  @text({ max: 40 })
  genre!: string;

  @int()
  year!: number;

  // "movie" or "tv"
  @text({ max: 10 })
  mediaType!: string;

  @int()
  titleCount!: number;

  // Vote-weighted mean score, 2 dp
  @decimal()
  avgRating!: number;

  @int()
  totalVotes!: number;
}
