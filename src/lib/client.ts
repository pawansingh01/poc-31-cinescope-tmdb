// client.ts - POC 31: CineScope
// Single RayfinClient instance plus thin fetch helpers.
//
// The fluent surface below was verified against the SHIPPED typings of
// @microsoft/rayfin-data 1.33.1 (GraphQLEntityClient/GraphQLQueryBuilder),
// not the docs:
//   client.data.<Entity>.select([...]) -> builder
//   builder.where({ field: { eq: v } }).first(n).after(cursor)
//   builder.execute() -> rows
//   builder.executePaginated() -> { items, hasNextPage, endCursor }
// There is no .query() and no skip/take - pagination is cursor-based.
//
// Environment values are written by `npx rayfin env` into .env.local
// (VITE_RAYFIN_API_URL, VITE_RAYFIN_PUBLISHABLE_KEY - verified names).

import { RayfinClient } from '@microsoft/rayfin-client';
import {
  ensureSignedInWithFabric,
  initEmbeddedAuth,
} from '@microsoft/rayfin-auth-provider-fabric';

export const client = new RayfinClient({
  baseUrl: import.meta.env.VITE_RAYFIN_API_URL ?? 'http://localhost:5168',
  publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY ?? '',
});

const fabricOptions = {
  workspaceId: import.meta.env.VITE_FABRIC_WORKSPACE_ID ?? '',
  projectId: import.meta.env.VITE_FABRIC_ITEM_ID ?? '',
  fabricPortalUrl:
    import.meta.env.VITE_FABRIC_PORTAL_URL ?? 'https://app.fabric.microsoft.com',
  returnOrigin: window.location.origin,
};

// Embedded (iframe) sign-in: when the app runs INSIDE the Fabric Portal this
// does the silent postMessage handoff and inherits the user's session — no
// popup, no button. Returns true when a session is established, false when the
// app is NOT embedded (standalone) — then we fall back to the popup flow.
// THIS is the call that makes the app load inside Fabric; the popup-only
// `ensureSignedInWithFabric` cannot complete inside the iframe.
export async function initEmbeddedSession(): Promise<boolean> {
  const session = await initEmbeddedAuth((client as any).auth, fabricOptions);
  return !!session?.isAuthenticated;
}

// Already-authenticated check. The session is persisted (localStorage), so on a
// page refresh we can reuse it directly instead of re-running the embedded
// handoff — the Fabric shell only emits the handoff once, so re-awaiting it
// after a refresh hangs forever ("Checking Fabric session…").
export function hasActiveSession(): boolean {
  try {
    return !!(client as any).auth.getSession?.()?.isAuthenticated;
  } catch {
    return false;
  }
}

// A stored, REFRESHABLE session — present in localStorage with a refresh token.
// `getSession()` reports not-authenticated once the short-lived access token
// expires, even though the (7-day) refresh token can still restore it. In that
// state we should NOT re-run the slow embedded handoff: just treat the user as
// signed in and let the SDK refresh the access token on the first data call.
export function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const v = localStorage.getItem(localStorage.key(i) as string) ?? '';
      if (!v.includes('refreshToken')) continue;
      const o = JSON.parse(v);
      if (o && o.accessToken && o.refreshToken) return true;
    }
  } catch {
    /* ignore parse/storage errors */
  }
  return false;
}

// Race a promise against a timeout that REJECTS, so a hung auth handoff can
// never freeze the UI on "checking" — the caller's catch falls through. We
// reject (not resolve) so that a resolved race always means real success.
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('auth-timeout')), ms),
    ),
  ]);
}

// Fabric brokered popup sign-in (standalone, outside the Portal). Steps 1-3 are
// silent (existing session / refresh token); step 4 opens the Fabric portal in
// a new tab and MUST be called from a user-gesture handler (the Sign-in button).
export async function ensureFabricSignIn(): Promise<void> {
  await ensureSignedInWithFabric((client as any).auth, fabricOptions);
}

// Hard sign-out: clears any stale local session so the next sign-in
// attempt falls through to the Fabric broker instead of dying on a
// poisoned refresh token.
export async function signOutFabric(): Promise<void> {
  try {
    await (client as any).auth.signOut();
  } catch {
    // best effort - a failed signOut must not block the retry
  }
}

const PAGE_SIZE = 2000;

function entityClient(entityName: string) {
  const ec = (client.data as Record<string, any>)[entityName];
  if (!ec) {
    throw new Error(
      `Entity '${entityName}' not found on RayfinClient. ` +
        'Check rayfin/data/schema.ts registration and redeploy.',
    );
  }
  return ec;
}

// Fetch every row of an entity with a column projection, following the
// cursor until exhausted.
export async function fetchAll<T>(
  entityName: string,
  columns: string[],
): Promise<T[]> {
  const ec = entityClient(entityName);
  const out: T[] = [];
  let cursor: string | undefined;
  for (;;) {
    let builder = ec.select(columns).first(PAGE_SIZE);
    if (cursor) builder = builder.after(cursor);
    const page = await builder.executePaginated();
    out.push(...(page.items as T[]));
    if (!page.hasNextPage || !page.endCursor) break;
    cursor = page.endCursor;
  }
  return out;
}

// Equality-filtered fetch using explicit DAB filter syntax.
export async function fetchWhere<T>(
  entityName: string,
  columns: string[],
  where: Record<string, string | number | boolean>,
): Promise<T[]> {
  const filter = Object.fromEntries(
    Object.entries(where).map(([k, v]) => [k, { eq: v }]),
  );
  return entityClient(entityName).select(columns).where(filter).execute();
}

// TMDB image CDN helper. Attribution: this product uses the TMDB API
// but is not endorsed or certified by TMDB.
export function tmdbImage(
  path: string | null | undefined,
  size: 'w92' | 'w185' | 'w342' = 'w185',
): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
