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
import { ensureSignedInWithFabric } from '@microsoft/rayfin-auth-provider-fabric';

export const client = new RayfinClient({
  baseUrl: import.meta.env.VITE_RAYFIN_API_URL ?? 'http://localhost:5168',
  publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY ?? '',
});

// Fabric brokered sign-in. The data plane rejects anonymous requests when
// fabric auth is enabled (observed as HTTP 404, not 401). Steps 1-3 of the
// helper's waterfall are silent (existing session, refresh token, embedded
// handoff); step 4 opens the Fabric portal in a new tab and MUST be called
// from a user-gesture handler to avoid popup blockers.
export async function ensureFabricSignIn(): Promise<void> {
  await ensureSignedInWithFabric((client as any).auth, {
    workspaceId: import.meta.env.VITE_FABRIC_WORKSPACE_ID ?? '',
    projectId: import.meta.env.VITE_FABRIC_ITEM_ID ?? '',
    fabricPortalUrl:
      import.meta.env.VITE_FABRIC_PORTAL_URL ?? 'https://app.fabric.microsoft.com',
    returnOrigin: window.location.origin,
  });
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
