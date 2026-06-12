// Principal.ts - POC 31: CineScope Film and TV Analytics
// Explicit join entity between Title and Person.
// Rayfin has no many-to-many support; this is the required pattern.
//
// Scope: directors plus top-3 billed cast per title. Roughly 50-70k rows.
// Movies: /movie/{id}/credits - crew where job = "Director", cast order <= 2.
// TV:     /tv/{id}/aggregate_credits - crew department "Directing" deduplicated,
//         cast by total_episode_count, top 3.
//
// Foreign key convention: {property}_id exactly - title_id, person_id.
//
// Source: TMDB API. This product uses the TMDB API but is not endorsed
// or certified by TMDB.

import { entity, uuid, text, int, one } from '@microsoft/rayfin-core';
// Value imports: the @one thunks reference the classes at runtime.
import { Title } from './Title.js';
import { Person } from './Person.js';

@entity()
export class Principal {
  @uuid()
  id!: string;

  // Foreign key to Title - follows Rayfin {property}_id convention.
  // Explicitly declared so Notebook 03 can set it directly when upserting.
  // Must be @uuid(), not @text(): the schema validator requires FK columns
  // backing @one() relationships to be UUID-typed.
  @uuid()
  title_id!: string;

  // Navigation: many Principals -> one Title
  @one(() => Title)
  title?: Title;

  // Foreign key to Person - follows Rayfin {property}_id convention.
  @uuid()
  person_id!: string;

  // Navigation: many Principals -> one Person
  @one(() => Person)
  person?: Person;

  // Credit category within this POC: "director" or "cast".
  // @text() not @set(): scope may widen to writers, composers, etc.
  @text({ max: 30 })
  category!: string;

  // Billing order for cast (0 = top billed). Directors normalised to 0
  // by Notebook 03.
  @int({ min: 0 })
  ordering!: number;

  // Character name for cast credits - e.g. "Andy Dufresne".
  // Null for directors. For TV, the most-credited role from
  // aggregate_credits is kept.
  @text({ optional: true, max: 500 })
  characterName?: string;
}
