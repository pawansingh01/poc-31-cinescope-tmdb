// vite.config.ts - POC 31: CineScope IMDb Analytics
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Keep the compressed archive well under the Rayfin 100MB static hosting limit.
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 5173,
  },
});
