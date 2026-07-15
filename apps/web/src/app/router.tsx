import * as React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { PublicLayout } from "./layouts/public-layout";
import { HomePlaceholder } from "./pages/home-placeholder";

/**
 * The admin tree is lazy-loaded as a single chunk so it never ships in the
 * public bundle (Frontend Implementation Review §5.5; bundle budget enforced
 * in CI, see .github/workflows/ci.yml). It does not exist yet — this route
 * is a stub that will be filled in during the Authentication/Authorization
 * phase, which is the next step in the approved dependency order.
 */
const AdminRootPlaceholder = React.lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="text-muted-foreground p-8">
        Admin console — built in the Authentication/Authorization phase.
      </div>
    ),
  }),
);

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [{ index: true, element: <HomePlaceholder /> }],
  },
  {
    path: "/admin/*",
    element: (
      <React.Suspense fallback={<div className="p-8">Loading…</div>}>
        <AdminRootPlaceholder />
      </React.Suspense>
    ),
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
