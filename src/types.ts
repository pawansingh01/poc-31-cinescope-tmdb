// types.ts - POC 31: CineScope
// Frontend row types mirroring the Rayfin entities in rayfin/data/.
// Kept separate from the entity classes so the Vite build never
// compiles decorator code into the bundle.

export interface TitleRow {
  id: string;
  tmdbKey: string;
  mediaType: 'movie' | 'tv';
  title: string;
  releaseYear: number;
  decade: number;
  runtimeMinutes?: number | null;
  genres: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  posterPath?: string | null;
  originalLanguage: string;
  isSeries: boolean;
}

export interface PersonRow {
  id: string;
  tmdbKey: string;
  name: string;
  knownForDepartment?: string | null;
  profilePath?: string | null;
  dominantRole: 'director' | 'cast';
  titleCount: number;
  avgRating: number;
  totalVotes: number;
}

export interface PrincipalRow {
  id: string;
  title_id: string;
  person_id: string;
  category: 'director' | 'cast';
  ordering: number;
  characterName?: string | null;
}

export interface YearStatRow {
  id: string;
  statKey: string;
  year: number;
  mediaType: 'movie' | 'tv';
  titleCount: number;
  avgRating: number;
  avgRuntime?: number | null;
  totalVotes: number;
}

export interface GenreYearStatRow {
  id: string;
  statKey: string;
  genre: string;
  year: number;
  mediaType: 'movie' | 'tv';
  titleCount: number;
  avgRating: number;
  totalVotes: number;
}
