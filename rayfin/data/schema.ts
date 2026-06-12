// schema.ts - POC 31: CineScope Film and TV Analytics
// Entity registry for Rayfin GraphQL client generation.
//
// Every entity class MUST be registered here.
// If an entity is defined in rayfin/data/ but missing from this file,
// it will NOT appear in the auto-generated GraphQL API - no error is thrown,
// it simply will not exist. This is a common gotcha when adding new entities.
//
// Update this file whenever you:
//   - Add a new entity
//   - Rename an entity
//   - Remove an entity (also run `npx rayfin up db apply --force`)

import type { Title } from './Title.js';
import type { Person } from './Person.js';
import type { Principal } from './Principal.js';
import type { YearStat } from './YearStat.js';
import type { GenreYearStat } from './GenreYearStat.js';

export type CineScopeSchema = {
  Title: Title;
  Person: Person;
  Principal: Principal;
  YearStat: YearStat;
  GenreYearStat: GenreYearStat;
};
