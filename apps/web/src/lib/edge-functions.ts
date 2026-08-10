import { AppError, toAppError, type AppErrorKind } from "@paz/types";
import type {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "./supabase";

type InvokeError = FunctionsHttpError | FunctionsRelayError | FunctionsFetchError;

function statusToKind(status: number): AppErrorKind {
  if (status === 401) return "auth";
  if (status === 403) return "permission";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status >= 400 && status < 500) return "validation";
  return "unexpected";
}

/**
 * Invokes an Edge Function and normalizes its error into an {@link AppError}
 * — the one place `supabase.functions.invoke`'s error shape is interpreted,
 * mirroring what `toAppError` does for PostgREST (`packages/types/src/errors.ts`).
 * Every Edge Function in this repo replies to a non-2xx with `{ error: string }`
 * (see `supabase/functions/*\/index.ts`), so this reads that body for the
 * message a person should actually see instead of the generic
 * "Edge Function returned a non-2xx status code" supabase-js supplies.
 */
export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = (await supabase.functions.invoke<T>(name, { body })) as {
    data: T | null;
    error: InvokeError | null;
  };

  if (error) {
    const response = error.context instanceof Response ? error.context : undefined;
    if (response) {
      let message = error.message || "Something went wrong.";
      try {
        const payload = (await response.clone().json()) as { error?: string };
        if (payload.error) message = payload.error;
      } catch {
        // Non-JSON body (network failure before the function ran, etc.) —
        // fall back to the generic message above.
      }
      throw new AppError(statusToKind(response.status), message, { cause: error });
    }
    throw toAppError(error);
  }

  return data as T;
}
