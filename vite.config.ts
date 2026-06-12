// vite.config.ts - POC 31: CineScope
//
// Dev-server proxy is REQUIRED: in Vite development the Rayfin ApiClient
// blanks its baseUrl and issues relative requests (/graphql, /api/...),
// expecting the dev server to forward them to the Fabric workload endpoint.
// Without this proxy every SDK call 404s against localhost:5173.
// The target comes from VITE_RAYFIN_API_URL in .env.local, written by
// `npx rayfin env`.
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const api = env.VITE_RAYFIN_API_URL ?? '';

  let proxy: Record<string, object> | undefined;
  try {
    const url = new URL(api);
    proxy = Object.fromEntries(
      ['/graphql', '/api'].map((prefix) => [
        prefix,
        {
          target: url.origin,
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => `${url.pathname}${path}`,
        },
      ]),
    );
  } catch {
    proxy = undefined; // no API URL yet (before first `npx rayfin env`)
  }

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      // Keep the compressed archive well under the Rayfin 100MB static hosting limit.
      sourcemap: false,
      chunkSizeWarningLimit: 800,
    },
    server: {
      port: 5173,
      proxy,
    },
  };
});
