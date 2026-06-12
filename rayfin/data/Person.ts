// Person.ts - POC 31: CineScope Film and TV Analytics
// One row per director or top-billed cast member appearing in the Title scope.
// Career statistics (titleCount, avgRating, totalVotes) are precomputed in
// Notebook 03. Rayfin SQL is a transactional store; aggregation belongs in
// the Fabric notebook layer.
//
// Source: TMDB API credits payloads (no separate /person calls needed -
// name, profile_path, known_for_department and popularity all arrive
// embedded in /movie/{id}/credits and /tv/{id}/aggregate_credits).
// This product uses the TMDB API but is not endorsed or certified by TMDB.

import { entity, uuid, text, int, decimal, many } from '@microsoft/rayfin-core';
// Value import: the @many thunk references the class at runtime.
import { Principal } from './Principal.js';

@entity()
export class Person {
  @uuid()
  id!: string;

  // TMDB person id stored as text - e.g. "138" (Quentin Tarantino).
  // Unique. Upsert key; UUID id derived from it (uuid5) in Notebook 03.
  @text({ unique: true, max: 20 })
  tmdbKey!: string;

  // Display name - e.g. "Quentin Tarantino"
  @text({ max: 300 })
  name!: string;

  // TMDB known_for_department - e.g. "Directing", "Acting".
  // @text() not @set(): TMDB department vocabulary is external.
  @text({ optional: true, max: 50 })
  knownForDepartment?: string;

  // TMDB profile image path. Hotlinked by the frontend as
  // https://image.tmdb.org/t/p/w185{profilePath}. Null where absent.
  @text({ optional: true, max: 100 })
  profilePath?: string;

  // Dominant role within this POC's scope: "director" or "cast".
  // Derived in Notebook 03 from the person's principal records.
  // Drives the People Analytics view toggle.
  @text({ max: 20 })
  dominantRole!: string;

  // Number of in-scope titles this person is credited on.
  // Precomputed. People Analytics ranks by this and filters out
  // small samples (minimum 3 titles) to avoid one-hit-wonder noise.
  @int()
  titleCount!: number;

  // Vote-weighted mean score across in-scope credited titles, 2 dp.
  // Vote-weighted, not simple mean: prevents a low-vote outlier title
  // from distorting a person's career score.
  @decimal()
  avgRating!: number;

  // Total votes across in-scope credited titles. Popularity proxy.
  @int()
  totalVotes!: number;

  // Navigation: one Person -> many Principals
  @many(() => Principal)
  credits?: Principal[];
}
