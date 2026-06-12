/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RAYFIN_BASE_URL?: string;
  readonly VITE_RAYFIN_PUBLISHABLE_KEY?: string;
  readonly VITE_RAYFIN_HOSTING_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
