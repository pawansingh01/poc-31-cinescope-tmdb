// GenreAnalysis.tsx - POC 31: CineScope
// View 2: genre output over time and genre rating comparison.
// All data comes from the precomputed GenreYearStat table.

import { useMemo, useState } from 'react';
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

const LINE_COLOURS = ['#5ad2f4', '#f4a85a', '#9d7bf4', '#5af48f', '#f45a8f'];
const MAX_SELECTED = 5;

export default function GenreAnalysis({ data }: { data: CineData }) {
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [selected, setSelected] = useState<string[]>(['Drama', 'Comedy', 'Action']);

  const rows = useMemo(
    () => data.genreYearStats.filter((g) => g.mediaType === mediaType),
    [data.genreYearStats, mediaType],
  );

  // Output over time for selected genres
  const outputSeries = useMemo(() => {
    const byYear = new Map<number, Record<string, number>>();
    for (const g of rows) {
      if (!selected.includes(g.genre)) continue;
      const row = byYear.get(g.year) ?? {};
      row[g.genre] = g.titleCount;
      byYear.set(g.year, row);
    }
    return [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, v]) => ({ year, ...v }));
  }, [rows, selected]);

  // All-time vote-weighted rating per genre
  const genreRatings = useMemo(() => {
    const acc = new Map<string, { weighted: number; votes: number; count: number }>();
    for (const g of rows) {
      const a = acc.get(g.genre) ?? { weighted: 0, votes: 0, count: 0 };
      a.weighted += g.avgRating * g.totalVotes;
      a.votes += g.totalVotes;
      a.count += g.titleCount;
      acc.set(g.genre, a);
    }
    return [...acc.entries()]
      .filter(([, a]) => a.count >= 20)
      .map(([genre, a]) => ({
        genre,
        avgRating: +(a.weighted / a.votes).toFixed(2),
        titleCount: a.count,
      }))
      .sort((a, b) => b.avgRating - a.avgRating);
  }, [rows]);

  function toggleGenre(genre: string) {
    setSelected((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length < MAX_SELECTED
          ? [...prev, genre]
          : prev,
    );
  }

  return (
    <div className="view">
      <section className="card">
        <div className="card-controls">
          <h2>Genre output over time</h2>
          <div className="toggle">
            <button className={mediaType === 'movie' ? 'active' : ''} onClick={() => setMediaType('movie')}>
              Movies
            </button>
            <button className={mediaType === 'tv' ? 'active' : ''} onClick={() => setMediaType('tv')}>
              TV
            </button>
          </div>
        </div>
        <div className="chip-row">
          {data.genreNames.map((g) => (
            <button
              key={g}
              className={selected.includes(g) ? 'chip active' : 'chip'}
              onClick={() => toggleGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <p className="card-note">
          Titles per year per genre (max {MAX_SELECTED} genres). A title with
          two genres counts in both - genre rows are never summed.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={outputSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3650" />
            <XAxis dataKey="year" stroke="#9aa4c0" />
            <YAxis stroke="#9aa4c0" />
            <Tooltip />
            <Legend />
            {selected.map((g, i) => (
              <Line
                key={g}
                type="monotone"
                dataKey={g}
                stroke={LINE_COLOURS[i % LINE_COLOURS.length]}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="card">
        <h2>Genre rating comparison ({mediaType === 'movie' ? 'movies' : 'TV'}, all years)</h2>
        <p className="card-note">
          Vote-weighted mean score per genre, minimum 20 in-scope titles.
        </p>
        <ResponsiveContainer width="100%" height={Math.max(280, genreRatings.length * 26)}>
          <BarChart data={genreRatings} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3650" />
            <XAxis type="number" domain={[5, 9]} stroke="#9aa4c0" />
            <YAxis type="category" dataKey="genre" width={120} stroke="#9aa4c0" />
            <Tooltip />
            <Bar dataKey="avgRating" name="Weighted avg score" fill="#9d7bf4" />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
