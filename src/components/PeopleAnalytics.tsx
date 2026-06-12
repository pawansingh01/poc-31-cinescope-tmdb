// PeopleAnalytics.tsx - POC 31: CineScope
// View 3: ranked directors and cast with filmography drill-down.
// Rankings read the precomputed career stats on Person; clicking a person
// runs the one on-demand query in this view - an equality lookup on
// Principal (person_id), the predicate shape the preview API supports.

import { useMemo, useState } from 'react';
import type { CineData } from '../hooks/useCineData';
import type { PersonRow, PrincipalRow, TitleRow } from '../types';
import { fetchWhere, tmdbImage } from '../lib/client';

const MIN_TITLES = 3;
const TOP_N = 25;

interface Filmography {
  person: PersonRow;
  entries: { principal: PrincipalRow; title: TitleRow }[];
}

export default function PeopleAnalytics({ data }: { data: CineData }) {
  const [role, setRole] = useState<'director' | 'cast'>('director');
  const [rankBy, setRankBy] = useState<'avgRating' | 'titleCount' | 'totalVotes'>('avgRating');
  const [filmography, setFilmography] = useState<Filmography | null>(null);
  const [loadingPerson, setLoadingPerson] = useState<string | null>(null);

  const ranked = useMemo(
    () =>
      data.people
        .filter((p) => p.dominantRole === role && p.titleCount >= MIN_TITLES)
        .sort((a, b) => b[rankBy] - a[rankBy])
        .slice(0, TOP_N),
    [data.people, role, rankBy],
  );

  async function openFilmography(person: PersonRow) {
    setLoadingPerson(person.id);
    try {
      const principals = await fetchWhere<PrincipalRow>(
        'Principal',
        ['id', 'title_id', 'person_id', 'category', 'ordering', 'characterName'],
        { person_id: person.id },
      );
      const entries = principals
        .map((principal) => ({ principal, title: data.titleById.get(principal.title_id) }))
        .filter((e): e is { principal: PrincipalRow; title: TitleRow } => !!e.title)
        .sort((a, b) => b.title.releaseYear - a.title.releaseYear);
      setFilmography({ person, entries });
    } finally {
      setLoadingPerson(null);
    }
  }

  return (
    <div className="view">
      <section className="card">
        <div className="card-controls">
          <h2>Top {role === 'director' ? 'directors' : 'actors'}</h2>
          <div className="toggle">
            <button className={role === 'director' ? 'active' : ''} onClick={() => setRole('director')}>
              Directors
            </button>
            <button className={role === 'cast' ? 'active' : ''} onClick={() => setRole('cast')}>
              Cast
            </button>
          </div>
          <div className="toggle">
            <button className={rankBy === 'avgRating' ? 'active' : ''} onClick={() => setRankBy('avgRating')}>
              By rating
            </button>
            <button className={rankBy === 'titleCount' ? 'active' : ''} onClick={() => setRankBy('titleCount')}>
              By output
            </button>
            <button className={rankBy === 'totalVotes' ? 'active' : ''} onClick={() => setRankBy('totalVotes')}>
              By votes
            </button>
          </div>
        </div>
        <p className="card-note">
          Vote-weighted career score across in-scope titles, minimum{' '}
          {MIN_TITLES} titles. Click a row for the filmography.
        </p>
        <table className="data-table clickable">
          <thead>
            <tr>
              <th>#</th>
              <th></th>
              <th>Name</th>
              <th>Titles</th>
              <th>Career score</th>
              <th>Total votes</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={p.id} onClick={() => openFilmography(p)}>
                <td className="num">{i + 1}</td>
                <td>
                  {tmdbImage(p.profilePath, 'w92') && (
                    <img className="profile-thumb" src={tmdbImage(p.profilePath, 'w92')!} alt="" />
                  )}
                </td>
                <td>
                  {p.name}
                  {loadingPerson === p.id && <span className="loading-dot"> …</span>}
                </td>
                <td className="num">{p.titleCount}</td>
                <td className="num">{p.avgRating.toFixed(2)}</td>
                <td className="num">{p.totalVotes.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {filmography && (
        <section className="card">
          <div className="card-controls">
            <h2>{filmography.person.name} - filmography in scope</h2>
            <button className="chip" onClick={() => setFilmography(null)}>
              Close
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Title</th>
                <th>Type</th>
                <th>Credit</th>
                <th>Score</th>
                <th>Votes</th>
              </tr>
            </thead>
            <tbody>
              {filmography.entries.map(({ principal, title }) => (
                <tr key={principal.id}>
                  <td>{title.releaseYear}</td>
                  <td>{title.title}</td>
                  <td>{title.mediaType === 'tv' ? 'TV' : 'Movie'}</td>
                  <td>
                    {principal.category === 'director'
                      ? 'Director'
                      : principal.characterName || 'Cast'}
                  </td>
                  <td className="num">{title.voteAverage.toFixed(1)}</td>
                  <td className="num">{title.voteCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
