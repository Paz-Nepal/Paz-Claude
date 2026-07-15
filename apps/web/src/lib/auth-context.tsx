import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { decodeJwtClaims, type AppJwtClaims } from "./jwt";

interface AuthState {
  session: Session | null;
  claims: AppJwtClaims | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

/**
 * The one place the app reads Supabase's auth session (Frontend
 * Implementation Review §5.2: auth/session is a React context wrapping the
 * Supabase session, not a global state library). `claims` is this session's
 * JWT payload decoded client-side (see lib/jwt.ts) so `usePermission()`
 * (modules/auth-core) can gate UI without a network round trip; it is never
 * the security boundary — RLS re-checks everything server-side.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    session: null,
    claims: null,
    loading: true,
  });

  React.useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState({
        session: data.session,
        claims: data.session ? decodeJwtClaims(data.session.access_token) : null,
        loading: false,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        session,
        claims: session ? decodeJwtClaims(session.access_token) : null,
        loading: false,
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = React.useMemo<AuthContextValue>(() => ({ ...state, signOut }), [state, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
}
