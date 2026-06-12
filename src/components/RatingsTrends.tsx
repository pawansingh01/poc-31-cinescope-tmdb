// RatingsTrends.tsx - POC 31: CineScope
// View 1: rating trends by year, output by decade, top-rated titles.
// Chart data comes from the precomputed YearStat table; the top-rated
// list reads the cached Title rows.

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CineData } from '../hooks/useCineData';
import { tmdbImage } from '../lib/client';

const MIN_VOTES_TOP_LIST = 5000;

export default function RatingsTrends({ data }: { data: CineData }) {
  const ratingByYear = useMemo(() => {
    const byYear = new Map<number, { year: number; movie?: number; tv?: number }>();
    for (const s of data.yearStats) {
      const row = byYear.get(s.year) ?? { year: s.year };
      row[s.mediaType] = s.avgRating;
      byYear.set(s.year, row);
    }
    return [...byYear.values()].sort((a, b) => a.year - b.year);
  }, [data.yearStats]);

  const countByDecade = useMemo(() => {
    const byDecade = new Map<number, { decade: string; movie: number; tv: number }>();
    for (const s of data.yearStats) {
      const d = Math.floor(s.year / 10) * 10;
      const row = byDecade.get(d) ?? { decade: `${d}s`, movie: 0, tv: 0 };
      row[s.mediaType] += s.titleCount;
      byDecade.set(d, row);
    }
    return [...byDecade.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);
  }, [data.yearStats]);

  const topRated = useMemo(
    () =>
      [...data.titles]
        .filter((t) => t.voteCount >= MIN_VOTES_TOP_LIST)
        .sort((a, b) => b.voteAverage - a.voteAverage || b.voteCount - a.voteCount)
        .slice(0, 15),
    [data.titles],
  );

  return (
    <div className="view">
      <section className="card">
        <h2>Average rating by release year</h2>
        <p className="card-note">
          Vote-weighted mean TMDB score per year. Precomputed in Fabric
          (Notebook 03), served from Rayfin SQL.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={ratingByYear}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3650" />
            <XAxis dataKey="year" stroke="#9aa4c0" />
            <YAxis domain={[5, 9]} stroke="#9aa4c0" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="movie" name="Movies" stroke="#5ad2f4" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="tv" name="TV" stroke="#f4a85a" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="card">
        <h2>Titles in scope by decade</h2>
        <p className="card-note">
          Scope: vote_count ≥ 500, released 1950 onwards. Recent decades
          dominate - both real output growth and TMDB vote concentration.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={countByDecade}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3650" />
            <XAxis dataKey="decade" stroke="#9aa4c0" />
            <YAxis stroke="#9aa4c0" />
            <Tooltip />
            <Legend />
            <Bar dataKey="movie" name="Movies" stackId="a" fill="#5ad2f4" />
            <Bar dataKey="tv" name="TV" stackId="a" fill="#f4a85a" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="card">
        <h2>Highest rated titles (≥ {MIN_VOTES_TOP_LIST.toLocaleString()} votes)</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Title</th>
              <th>Year</th>
              <th>Type</th>
              <th>Genres</th>
              <th>Score</th>
              <th>Votes</th>
            </tr>
          </thead>
          <tbody>
            {topRated.map((t) => (
              <tr key={t.id}>
                <td>
                  {tmdbImage(t.posterPath, 'w92') && (
                    <img className="poster-thumb" src={tmdbImage(t.posterPath, 'w92')!} alt="" />
                  )}
                </td>
                <td>{t.title}</td>
                <td>{t.releaseYear}</td>
                <td>{t.mediaType === 'tv' ? 'TV' : 'Movie'}</td>
                <td>{t.genres}</td>
                <td className="num">{t.voteAverage.toFixed(1)}</td>
                <td className="num">{t.voteCount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
