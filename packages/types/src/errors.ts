/**
 * Application-wide error taxonomy.
 *
 * Every error surfaced to a user — in the public site or the admin console —
 * is normalized to one of these kinds before it reaches UI code. This is the
 * *only* place PostgREST/Supabase error shapes are interpreted (Build
 * Readiness Review §5.4); nothing else in the frontend should pattern-match
 * on `error.code` or `error.message` directly.
 */
export type AppErrorKind =
  "auth" | "permission" | "validation" | "not_found" | "conflict" | "network" | "unexpected";

export class AppError extends Error {
  readonly kind: AppErrorKind;
  /** Opaque id to quote in the calm error UI ("reference ABC123") and in Sentry. */
  readonly reference: string;
  override readonly cause?: unknown;

  constructor(kind: AppErrorKind, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "AppError";
    this.kind = kind;
    this.cause = options?.cause;
    this.reference = crypto.randomUUID().slice(0, 8).toUpperCase();
  }
}

/** Postgres error codes we translate explicitly; everything else is "unexpected". */
const POSTGRES_CODE_MAP: Record<string, AppErrorKind> = {
  "23505": "conflict", // unique_violation
  "23503": "conflict", // foreign_key_violation
  "23514": "validation", // check_violation
  "42501": "permission", // insufficient_privilege (RLS denial surfaces here)
  PGRST116: "not_found", // PostgREST: no rows found for .single()
  PGRST301: "auth", // PostgREST: JWT expired/invalid
};

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

/**
 * Converts a thrown Supabase/PostgREST error (or anything else) into an
 * {@link AppError}. Safe to call on unknown values — network failures,
 * aborted requests, and genuinely unexpected throws all resolve to a kind.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (typeof error === "object" && error !== null && "code" in error) {
    const pgError = error as PostgrestLikeError;
    const kind = (pgError.code ? POSTGRES_CODE_MAP[pgError.code] : undefined) ?? "unexpected";
    return new AppError(kind, pgError.message ?? "Something went wrong.", { cause: error });
  }

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return new AppError("network", "Could not reach the server. Please check your connection.", {
      cause: error,
    });
  }

  return new AppError("unexpected", "Something went wrong.", { cause: error });
}
