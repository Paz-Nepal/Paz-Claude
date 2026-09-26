/// <reference types="vite/client" />

declare module "virtual:wording-defaults" {
  const defaults: Record<string, { en: string; ne?: string }>;
  export default defaults;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
declare const __MARK__: boolean;
