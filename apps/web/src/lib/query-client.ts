import { QueryClient } from "@tanstack/react-query";
import { toAppError } from "@paz/types";

/**
 * One QueryClient for the app. `throwOnError` normalizes every query/mutation
 * failure through {@link toAppError} before it reaches a component, so error
 * boundaries and inline error UI never see a raw PostgREST error shape.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const appError = toAppError(error);
        // Never retry permission/validation/not-found errors — retrying
        // won't change the outcome and only delays the user's feedback.
        if (["permission", "validation", "not_found"].includes(appError.kind)) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
