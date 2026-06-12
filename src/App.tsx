// App.tsx - POC 31: CineScope
// Tabbed shell for the four analytics views, plus the mandatory TMDB
// attribution footer. The footer notice must remain prominent - it is
// a condition of the TMDB API terms.

import { useState } from 'react';
import { useCineData } from './hooks/useCineData';
import RatingsTrends from './components/RatingsTrends';
import GenreAnalysis from './components/GenreAnalysis';
import PeopleAnalytics from './components/PeopleAnalytics';
import SearchExplore from './components/SearchExplore';

type Tab = 'trends' | 'genres' | 'people' | 'explore';

const TABS: { key: Tab; label: string }[] = [
  { key: 'trends', label: 'Ratings & Trends' },
  { key: 'genres', label: 'Genre Analysis' },
  { key: 'people', label: 'People Analytics' },
  { key: 'explore', label: 'Search & Explore' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('trends');
  const data = useCineData();

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>CineScope</h1>
          <p className="subtitle">
            Film &amp; TV analytics on Microsoft Fabric with Rayfin · POC 31
          </p>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? 'tab active' : 'tab'}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {data.loading && (
          <div className="status-panel">Loading data from Fabric…</div>
        )}
        {data.error && (
          <div className="status-panel error">
            <strong>Could not load data.</strong>
            <p>{data.error}</p>
            <p>
              Check that the app is deployed (`npx rayfin up`), the database
              is seeded (Notebooks 01-03), and `npx rayfin env` has written
              the Vite environment file.
            </p>
          </div>
        )}
        {!data.loading && !data.error && (
          <>
            {tab === 'trends' && <RatingsTrends data={data} />}
            {tab === 'genres' && <GenreAnalysis data={data} />}
            {tab === 'people' && <PeopleAnalytics data={data} />}
            {tab === 'explore' && <SearchExplore data={data} />}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          This product uses the TMDB API but is not endorsed or certified by{' '}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            TMDB
          </a>
          . All film and TV data and images are supplied by TMDB.
        </p>
        <p>
          Built on Microsoft Fabric with Rayfin · Data refreshed within 6
          months per TMDB caching terms.
        </p>
      </footer>
    </div>
  );
}
