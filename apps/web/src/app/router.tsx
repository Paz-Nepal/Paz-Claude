import * as React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { PublicLayout } from "./layouts/public-layout";
import { HomePage } from "@/modules/site";

/**
 * Everything except the homepage is lazy-loaded on its own chunk (Frontend
 * Implementation Review §5.5; the CI bundle budget keeps the public entry
 * under 150KB gz). Admin routes reach into modules' page files directly
 * rather than their index barrels on purpose: importing a barrel would pull
 * the whole module into whichever chunk touches it first, defeating the
 * split. `eslint-plugin-boundaries` permits `app` → module internals; only
 * module-to-module imports are restricted to index.ts.
 */
const SignInPage = React.lazy(() =>
  import("@/modules/auth-core/pages/sign-in-page").then((m) => ({ default: m.SignInPage })),
);
const MfaEnrollPage = React.lazy(() =>
  import("@/modules/auth-core/pages/mfa-enroll-page").then((m) => ({ default: m.MfaEnrollPage })),
);
const ProtectedRoute = React.lazy(() =>
  import("@/modules/auth-core/components/protected-route").then((m) => ({
    default: m.ProtectedRoute,
  })),
);
const AdminLayout = React.lazy(() =>
  import("@/modules/admin-core/components/admin-layout").then((m) => ({
    default: m.AdminLayout,
  })),
);
const DeskPage = React.lazy(() =>
  import("@/modules/publishing/pages/desk-page").then((m) => ({ default: m.DeskPage })),
);
const ItemEditorPage = React.lazy(() =>
  import("@/modules/publishing/pages/item-editor-page").then((m) => ({
    default: m.ItemEditorPage,
  })),
);
const MediaPage = React.lazy(() =>
  import("@/modules/publishing/pages/media-page").then((m) => ({ default: m.MediaPage })),
);
const SettingsPage = React.lazy(() =>
  import("@/modules/admin-core/pages/settings-page").then((m) => ({ default: m.SettingsPage })),
);
const JournalPage = React.lazy(() =>
  import("@/modules/site/pages/journal-page").then((m) => ({ default: m.JournalPage })),
);
const ArticlePage = React.lazy(() =>
  import("@/modules/site/pages/article-page").then((m) => ({ default: m.ArticlePage })),
);
const CmsPage = React.lazy(() =>
  import("@/modules/site/pages/cms-page").then((m) => ({ default: m.CmsPage })),
);

function withSuspense(element: React.ReactNode) {
  return <React.Suspense fallback={<div className="p-8">Loading…</div>}>{element}</React.Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "journal", element: withSuspense(<JournalPage />) },
      { path: "journal/:slug", element: withSuspense(<ArticlePage />) },
      { path: "sign-in", element: withSuspense(<SignInPage />) },
      // CMS-controlled top-level pages (/about, /visit, …). Static routes
      // above always win route ranking over this dynamic segment.
      { path: ":slug", element: withSuspense(<CmsPage />) },
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
    children: [
      {
        element: withSuspense(<AdminLayout />),
        children: [
          { index: true, element: <Navigate to="/admin/desk" replace /> },
          {
            path: "desk",
            element: withSuspense(<ProtectedRoute permission="publishing.item.create" />),
            children: [
              { index: true, element: withSuspense(<DeskPage />) },
              { path: "new", element: withSuspense(<ItemEditorPage />) },
              { path: ":id", element: withSuspense(<ItemEditorPage />) },
            ],
          },
          {
            path: "media",
            element: withSuspense(<ProtectedRoute permission="publishing.media.read" />),
            children: [{ index: true, element: withSuspense(<MediaPage />) }],
          },
          {
            path: "settings",
            element: withSuspense(<ProtectedRoute permission="admin.settings.read" />),
            children: [{ index: true, element: withSuspense(<SettingsPage />) }],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
