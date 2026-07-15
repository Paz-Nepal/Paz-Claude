import * as React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { PublicLayout } from "./layouts/public-layout";
import { HomePlaceholder } from "./pages/home-placeholder";

/**
 * Every route below except the home placeholder is lazy-loaded on its own
 * chunk (Frontend Implementation Review §5.5; bundle budget enforced in CI)
 * so `react-hook-form`/`zod`/the MFA flow never ship in the bundle a public
 * visitor downloads just to read the homepage. This reaches into
 * `modules/auth-core`'s individual files rather than its `index.ts` barrel
 * on purpose: importing the barrel here would pull every export (including
 * the ones only ever used behind `/admin`) into whichever chunk first
 * touches it, defeating the split. `eslint-plugin-boundaries` still permits
 * `app` to import a module's internals directly (only module-to-module
 * imports are restricted to `index.ts`), so this is within the rule, not an
 * exception to it.
 */
const SignInPage = React.lazy(() =>
  import("@/modules/auth-core/pages/sign-in-page").then((m) => ({ default: m.SignInPage })),
);
const MfaEnrollPage = React.lazy(() =>
  import("@/modules/auth-core/pages/mfa-enroll-page").then((m) => ({ default: m.MfaEnrollPage })),
);
const AdminHomePage = React.lazy(() =>
  import("@/modules/auth-core/pages/admin-home-page").then((m) => ({ default: m.AdminHomePage })),
);
const ProtectedRoute = React.lazy(() =>
  import("@/modules/auth-core/components/protected-route").then((m) => ({
    default: m.ProtectedRoute,
  })),
);

function withSuspense(element: React.ReactNode) {
  return <React.Suspense fallback={<div className="p-8">Loading…</div>}>{element}</React.Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePlaceholder /> },
      { path: "sign-in", element: withSuspense(<SignInPage />) },
    ],
  },
  {
    path: "/admin/mfa-enroll",
    element: withSuspense(<ProtectedRoute requireMfa={false} />),
    children: [{ index: true, element: withSuspense(<MfaEnrollPage />) }],
  },
  {
    path: "/admin",
    element: withSuspense(<ProtectedRoute requireMfa />),
    children: [{ index: true, element: withSuspense(<AdminHomePage />) }],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
