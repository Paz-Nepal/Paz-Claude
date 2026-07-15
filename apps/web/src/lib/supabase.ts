import { createClient } from "@supabase/supabase-js";
import type { Database } from "@paz/types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: VITE_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: VITE_SUPABASE_ANON_KEY");
}

/**
 * The one Supabase client instance for the app (Frontend Implementation
 * Review §5.2 — no ad-hoc client construction inside modules). `Database`
 * comes from the generated types, so every `.from(...)` call is checked
 * against the actual migrated schema.
 *
 * NOTE: this file only establishes the connection. Session handling,
 * sign-in UI, and `ProtectedRoute` are built in the next phase
 * (Authentication), per the approved dependency order — intentionally not
 * included here.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
