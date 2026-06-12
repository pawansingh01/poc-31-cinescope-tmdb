// client.ts - POC 31: CineScope
// Single RayfinClient instance plus thin fetch helpers.
//
// Environment values are written by the Rayfin CLI:
//   - `npx rayfin env` generates the Vite env file from rayfin/.env
//   - after `npx rayfin up`, VITE_RAYFIN_BASE_URL points at the deployed
//     Fabric App endpoint
//
// NOTE: Rayfin is in preview. The query builder surface (select/where/
// take/skip) may shift between CLI versions. fetchAll() degrades to a
// single unpaged execute() when paging methods are absent.

import { RayfinClient } from '@microsoft/rayfin-client';

export const client = new RayfinClient({
  baseUrl: import.meta.env.VITE_RAYFIN_BASE_URL ?? 'http://localhost:5168',
  publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY ?? '',
});

// Generic helper: fetch every row of an entity with a column projection.
// Pages through take/skip when the preview client supports it.
export async function fetchAll<T>(
  entityName: string,
  columns: string[],
  pageSize = 5000,
): Promise<T[]> {
  const entityClient = (client.data as Record<string, any>)[entityName];
  if (!entityClient) {
    throw new Error(
      `Entity '${entityName}' not found on RayfinClient. ` +
        'Check rayfin/data/schema.ts registration and redeploy.',
    );
  }

  const baseQuery = () => entityClient.query().select(columns);

  // Paged path
  const probe = baseQuery();
  if (typeof probe.take === 'function' && typeof probe.skip === 'function') {
    const rows: T[] = [];
    for (let page = 0; ; page++) {
      const batch: T[] = await baseQuery()
        .skip(page * pageSize)
        .take(pageSize)
        .execute();
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }
    return rows;
  }

  // Unpaged fallback
  return probe.execute();
}

// Equality-filtered fetch - the only predicate shape the preview API
// is guaranteed to support.
export async function fetchWhere<T>(
  entityName: string,
  columns: string[],
  where: Record<string, string | number | boolean>,
): Promise<T[]> {
  const entityClient = (client.data as Record<string, any>)[entityName];
  if (!entityClient) {
    throw new Error(`Entity '${entityName}' not found on RayfinClient.`);
  }
  return entityClient.query().select(columns).where(where).execute();
}

// TMDB image CDN helper. Attribution: this product uses the TMDB API
// but is not endorsed or certified by TMDB.
export function tmdbImage(
  path: string | null | undefined,
  size: 'w92' | 'w185' | 'w342' = 'w185',
): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
