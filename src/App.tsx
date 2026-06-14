// App.tsx - POC 31: CineScope
// Tabbed shell for the four analytics views, plus the mandatory TMDB
// attribution footer. The footer notice must remain prominent - it is
// a condition of the TMDB API terms.

import { useEffect, useState } from 'react';
import { useCineData } from './hooks/useCineData';
import {
  ensureFabricSignIn,
  hasActiveSession,
  initEmbeddedSession,
  signOutFabric,
  withTimeout,
} from './lib/client';
import RatingsTrends from './components/RatingsTrends';
import GenreAnalysis from './components/GenreAnalysis';
import PeopleAnalytics from './components/PeopleAnalytics';
import SearchExplore from './components/SearchExplore';

type Tab = 'trends' | 'genres' | 'people' | 'explore';
type AuthState = 'checking' | 'needs-signin' | 'signed-in' | 'error';

const TABS: { key: Tab; label: string }[] = [
  { key: 'trends', label: 'Ratings & Trends' },
  { key: 'genres', label: 'Genre Analysis' },
  { key: 'people', label: 'People Analytics' },
  { key: 'explore', label: 'Search & Explore' },
];

// Data loading lives below the auth gate so no API call happens before
// the Fabric session exists.
function AuthedApp({ tab }: { tab: Tab }) {
  const data = useCineData();

  return (
    <>
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
    </>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('trends');
  const [auth, setAuth] = useState<AuthState>('checking');
  const [authError, setAuthError] = useState<string | null>(null);

  // On load: first try the EMBEDDED handoff (silent, when running inside the
  // Fabric Portal iframe). If not embedded, try a silent brokered sign-in
  // (existing session / refresh token). If both fail, fall back to an explicit
  // button so the portal tab is opened from a user gesture.
  useEffect(() => {
    (async () => {
      // 0) Reuse a stored session — makes refresh instant and avoids re-running
      //    the one-shot embedded handoff (which hangs on a second attempt).
      if (hasActiveSession()) {
        setAuth('signed-in');
        return;
      }
      // 1) Embedded (iframe) handoff, time-boxed so it can never hang the UI.
      try {
        if (await withTimeout(initEmbeddedSession(), 8000, false)) {
          setAuth('signed-in');
          return;
        }
      } catch {
        /* not embedded or handoff failed — fall through to the popup flow */
      }
      // 2) Standalone: silent brokered sign-in, else the explicit button.
      ensureFabricSignIn()
        .then(() => setAuth('signed-in'))
        .catch(() => setAuth('needs-signin'));
    })();
  }, []);

  async function signIn() {
    try {
      await ensureFabricSignIn();
      setAuth('signed-in');
    } catch {
      // Stale local session (e.g. from an earlier failed flow) can poison
      // the refresh step. Hard sign-out clears it, then retry once - the
      // waterfall then falls through to the Fabric broker tab.
      try {
        await signOutFabric();
        await ensureFabricSignIn();
        setAuth('signed-in');
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : String(e));
        setAuth('error');
      }
    }
  }

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
        {auth === 'checking' && (
          <div className="status-panel">Checking Fabric session…</div>
        )}
        {auth === 'needs-signin' && (
          <div className="status-panel">
            <p>Sign in with your Fabric identity to load the data.</p>
            <button className="signin-button" onClick={signIn}>
              Sign in with Microsoft Fabric
            </button>
          </div>
        )}
        {auth === 'error' && (
          <div className="status-panel error">
            <strong>Sign-in failed.</strong>
            <p>{authError}</p>
            <p>
              Check that pop-ups are allowed for this site and that your
              account has access to the Fabric workspace.
            </p>
          </div>
        )}
        {auth === 'signed-in' && <AuthedApp tab={tab} />}
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
