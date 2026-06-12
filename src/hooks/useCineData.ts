// useCineData.ts - POC 31: CineScope
// Loads the analytical datasets once on mount and caches them in memory.
//
// Volume budget (why a one-shot load is acceptable here):
//   YearStat       ~150 rows
//   GenreYearStat  ~2-4k rows
//   Title          ~12-18k rows, slim projection
//   Person         ~10-15k rows, slim projection
// Total well under 10MB. Charts read the precomputed stat tables;
// Search & Explore filters the cached Title rows client-side, so the
// only on-demand queries left are equality lookups on Principal.

import { useEffect, useMemo, useState } from 'react';
import { fetchAll } from '../lib/client';
import type {
  GenreYearStatRow,
  PersonRow,
  TitleRow,
  YearStatRow,
} from '../types';

export interface CineData {
  loading: boolean;
  error: string | null;
  titles: TitleRow[];
  people: PersonRow[];
  yearStats: YearStatRow[];
  genreYearStats: GenreYearStatRow[];
  titleById: Map<string, TitleRow>;
  personById: Map<string, PersonRow>;
  genreNames: string[];
}

export function useCineData(): CineData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [titles, setTitles] = useState<TitleRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [yearStats, setYearStats] = useState<YearStatRow[]>([]);
  const [genreYearStats, setGenreYearStats] = useState<GenreYearStatRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [titleRows, personRows, yearRows, genreRows] = await Promise.all([
          fetchAll<TitleRow>('Title', [
            'id',
            'tmdbKey',
            'mediaType',
            'title',
            'releaseYear',
            'decade',
            'runtimeMinutes',
            'genres',
            'voteAverage',
            'voteCount',
            'popularity',
            'posterPath',
            'originalLanguage',
            'isSeries',
          ]),
          fetchAll<PersonRow>('Person', [
            'id',
            'tmdbKey',
            'name',
            'knownForDepartment',
            'profilePath',
            'dominantRole',
            'titleCount',
            'avgRating',
            'totalVotes',
          ]),
          fetchAll<YearStatRow>('YearStat', [
            'id',
            'statKey',
            'year',
            'mediaType',
            'titleCount',
            'avgRating',
            'avgRuntime',
            'totalVotes',
          ]),
          fetchAll<GenreYearStatRow>('GenreYearStat', [
            'id',
            'statKey',
            'genre',
            'year',
            'mediaType',
            'titleCount',
            'avgRating',
            'totalVotes',
          ]),
        ]);

        if (cancelled) return;
        setTitles(titleRows);
        setPeople(personRows);
        setYearStats(yearRows.sort((a, b) => a.year - b.year));
        setGenreYearStats(genreRows);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const titleById = useMemo(
    () => new Map(titles.map((t) => [t.id, t])),
    [titles],
  );
  const personById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );
  const genreNames = useMemo(
    () => [...new Set(genreYearStats.map((g) => g.genre))].sort(),
    [genreYearStats],
  );

  return {
    loading,
    error,
    titles,
    people,
    yearStats,
    genreYearStats,
    titleById,
    personById,
    genreNames,
  };
}
