// SearchExplore.tsx - POC 31: CineScope
// View 4: filterable title explorer with credit drill-down.
// Filtering and sorting run client-side over the cached Title rows
// (12-18k slim rows, comfortably in memory). The only network call is
// the equality lookup on Principal when a row is opened.

import { useMemo, useState } from 'react';
import type { CineData } from '../hooks/useCineData';
import type { PrincipalRow, TitleRow } from '../types';
import { fetchWhere, tmdbImage } from '../lib/client';

const PAGE_SIZE = 25;

type SortKey = 'voteCount' | 'voteAverage' | 'releaseYear' | 'popularity';

interface TitleDetail {
  title: TitleRow;
  principals: PrincipalRow[];
}

export default function SearchExplore({ data }: { data: CineData }) {
  const [search, setSearch] = useState('');
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [genre, setGenre] = useState('all');
  const [yearFrom, setYearFrom] = useState(1950);
  const [yearTo, setYearTo] = useState(2026);
  const [minRating, setMinRating] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('voteCount');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<TitleDetail | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.titles
      .filter(
        (t) =>
          (mediaType === 'all' || t.mediaType === mediaType) &&
          (genre === 'all' || t.genres.includes(genre)) &&
          t.releaseYear >= yearFrom &&
          t.releaseYear <= yearTo &&
          t.voteAverage >= minRating &&
          (!q || t.title.toLowerCase().includes(q)),
      )
      .sort((a, b) => b[sortKey] - a[sortKey]);
  }, [data.titles, search, mediaType, genre, yearFrom, yearTo, minRating, sortKey]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  async function openDetail(title: TitleRow) {
    const principals = await fetchWhere<PrincipalRow>(
      'Principal',
      ['id', 'title_id', 'person_id', 'category', 'ordering', 'characterName'],
      { title_id: title.id },
    );
    principals.sort((a, b) =>
      a.category === b.category ? a.ordering - b.ordering : a.category === 'director' ? -1 : 1,
    );
    setDetail({ title, principals });
  }

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(0);
    };
  }

  return (
    <div className="view">
      <section className="card">
        <h2>Search &amp; explore</h2>
        <div className="filter-row">
          <input
            className="search-input"
            placeholder="Search titles…"
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
          />
          <select value={mediaType} onChange={(e) => resetPage(setMediaType)(e.target.value as 'all' | 'movie' | 'tv')}>
            <option value="all">Movies + TV</option>
            <option value="movie">Movies</option>
            <option value="tv">TV</option>
          </select>
          <select value={genre} onChange={(e) => resetPage(setGenre)(e.target.value)}>
            <option value="all">All genres</option>
            {data.genreNames.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <label>
            From
            <input type="number" value={yearFrom} min={1950} max={2026} onChange={(e) => resetPage(setYearFrom)(+e.target.value)} />
          </label>
          <label>
            To
            <input type="number" value={yearTo} min={1950} max={2026} onChange={(e) => resetPage(setYearTo)(+e.target.value)} />
          </label>
          <label>
            Min score
            <input type="number" value={minRating} min={0} max={10} step={0.5} onChange={(e) => resetPage(setMinRating)(+e.target.value)} />
          </label>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="voteCount">Most voted</option>
            <option value="voteAverage">Highest rated</option>
            <option value="releaseYear">Newest</option>
            <option value="popularity">Trending (snapshot)</option>
          </select>
        </div>
        <p className="card-note">{filtered.length.toLocaleString()} titles match.</p>
        <table className="data-table clickable">
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
            {pageRows.map((t) => (
              <tr key={t.id} onClick={() => openDetail(t)}>
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
        <div className="pager">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page + 1} of {Math.max(pageCount, 1)}
          </span>
          <button disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      </section>

      {detail && (
        <section className="card detail-card">
          <div className="card-controls">
            <h2>{detail.title.title}</h2>
            <button className="chip" onClick={() => setDetail(null)}>
              Close
            </button>
          </div>
          <div className="detail-body">
            {tmdbImage(detail.title.posterPath, 'w342') && (
              <img className="poster-large" src={tmdbImage(detail.title.posterPath, 'w342')!} alt="" />
            )}
            <div>
              <p>
                {detail.title.mediaType === 'tv' ? 'TV series' : 'Movie'} ·{' '}
                {detail.title.releaseYear} · {detail.title.genres}
                {detail.title.runtimeMinutes ? ` · ${detail.title.runtimeMinutes} min` : ''}
              </p>
              <p>
                <strong>{detail.title.voteAverage.toFixed(1)}</strong> /10 ·{' '}
                {detail.title.voteCount.toLocaleString()} votes
              </p>
              <h3>Credits in scope</h3>
              <ul className="credit-list">
                {detail.principals.map((p) => {
                  const person = data.personById.get(p.person_id);
                  return (
                    <li key={p.id}>
                      <strong>{person?.name ?? 'Unknown'}</strong>
                      {p.category === 'director'
                        ? ' - Director'
                        : p.characterName
                          ? ` as ${p.characterName}`
                          : ' - Cast'}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
