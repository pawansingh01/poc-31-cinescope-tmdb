// YearStat.ts - POC 31: CineScope Film and TV Analytics
// Pre-aggregated per-year statistics, one row per (year, mediaType).
// Roughly 150 rows. Computed by Notebook 03.
//
// Design decision: aggregates are precomputed in the notebook layer, not
// computed client-side over the full Title table and not via GraphQL
// aggregation. Rayfin's generated GraphQL API is a CRUD API; pushing
// group-by work into Fabric notebooks keeps the frontend to simple,
// fast equality reads.

import { entity, uuid, text, int, decimal } from '@microsoft/rayfin-core';

@entity()
export class YearStat {
  @uuid()
  id!: string;

  // Upsert key - e.g. "1994-movie". UUID derived from it (uuid5).
  @text({ unique: true, max: 20 })
  statKey!: string;

  @int()
  year!: number;

  // "movie" or "tv"
  @text({ max: 10 })
  mediaType!: string;

  // Number of in-scope titles released this year
  @int()
  titleCount!: number;

  // Vote-weighted mean score for the year, 2 dp
  @decimal()
  avgRating!: number;

  // Mean movie runtime for the year, minutes. Null for tv rows.
  @decimal({ optional: true })
  avgRuntime?: number;

  @int()
  totalVotes!: number;
}
