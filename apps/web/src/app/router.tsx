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
const SearchPage = React.lazy(() =>
  import("@/modules/site/pages/search-page").then((m) => ({ default: m.SearchPage })),
);
const PressPage = React.lazy(() =>
  import("@/modules/site/pages/press-page").then((m) => ({ default: m.PressPage })),
);
const HousePage = React.lazy(() =>
  import("@/modules/site/pages/house-page").then((m) => ({ default: m.HousePage })),
);
const HearthPage = React.lazy(() =>
  import("@/modules/site/pages/hearth-page").then((m) => ({ default: m.HearthPage })),
);
const RecordOrganPage = React.lazy(() =>
  import("@/modules/site/pages/record-organ-page").then((m) => ({
    default: m.RecordOrganPage,
  })),
);
const PapersIndexPage = React.lazy(() =>
  import("@/modules/site/pages/papers-index-page").then((m) => ({
    default: m.PapersIndexPage,
  })),
);
const PaperPage = React.lazy(() =>
  import("@/modules/site/pages/paper-page").then((m) => ({ default: m.PaperPage })),
);
const BriefIndexPage = React.lazy(() =>
  import("@/modules/site/pages/brief-index-page").then((m) => ({ default: m.BriefIndexPage })),
);
const BriefPage = React.lazy(() =>
  import("@/modules/site/pages/brief-page").then((m) => ({ default: m.BriefPage })),
);
const DispatchIndexPage = React.lazy(() =>
  import("@/modules/site/pages/dispatch-index-page").then((m) => ({
    default: m.DispatchIndexPage,
  })),
);
const DispatchPage = React.lazy(() =>
  import("@/modules/site/pages/dispatch-page").then((m) => ({ default: m.DispatchPage })),
);
const PigeonPostIndexPage = React.lazy(() =>
  import("@/modules/site/pages/pigeon-post-index-page").then((m) => ({
    default: m.PigeonPostIndexPage,
  })),
);
const PigeonPostPage = React.lazy(() =>
  import("@/modules/site/pages/pigeon-post-page").then((m) => ({
    default: m.PigeonPostPage,
  })),
);
const AnnualIndexPage = React.lazy(() =>
  import("@/modules/site/pages/annual-index-page").then((m) => ({
    default: m.AnnualIndexPage,
  })),
);
const AnnualPage = React.lazy(() =>
  import("@/modules/site/pages/annual-page").then((m) => ({ default: m.AnnualPage })),
);
const RecordPage = React.lazy(() =>
  import("@/modules/site/pages/record-page").then((m) => ({ default: m.RecordPage })),
);
const ApplyPage = React.lazy(() =>
  import("@/modules/membership/pages/apply-page").then((m) => ({ default: m.ApplyPage })),
);
const DirectoryPage = React.lazy(() =>
  import("@/modules/membership/pages/directory-page").then((m) => ({ default: m.DirectoryPage })),
);
const AcceptInvitationPage = React.lazy(() =>
  import("@/modules/membership/pages/accept-invitation-page").then((m) => ({
    default: m.AcceptInvitationPage,
  })),
);
const ApplicationsPage = React.lazy(() =>
  import("@/modules/membership/pages/applications-page").then((m) => ({
    default: m.ApplicationsPage,
  })),
);
const MembersPage = React.lazy(() =>
  import("@/modules/membership/pages/members-page").then((m) => ({ default: m.MembersPage })),
);
const MemberDetailPage = React.lazy(() =>
  import("@/modules/membership/pages/member-detail-page").then((m) => ({
    default: m.MemberDetailPage,
  })),
);
const CalendarPage = React.lazy(() =>
  import("@/modules/programs/pages/calendar-page").then((m) => ({ default: m.CalendarPage })),
);
const ProgramPage = React.lazy(() =>
  import("@/modules/programs/pages/program-page").then((m) => ({ default: m.ProgramPage })),
);
const MyRegistrationsPage = React.lazy(() =>
  import("@/modules/programs/pages/my-registrations-page").then((m) => ({
    default: m.MyRegistrationsPage,
  })),
);
const AdminProgramsPage = React.lazy(() =>
  import("@/modules/programs/pages/admin-programs-page").then((m) => ({
    default: m.AdminProgramsPage,
  })),
);
const ProgramEditorPage = React.lazy(() =>
  import("@/modules/programs/pages/program-editor-page").then((m) => ({
    default: m.ProgramEditorPage,
  })),
);
const SessionRosterPage = React.lazy(() =>
  import("@/modules/programs/pages/session-roster-page").then((m) => ({
    default: m.SessionRosterPage,
  })),
);
const OrganizationsPage = React.lazy(() =>
  import("@/modules/crm/pages/organizations-page").then((m) => ({ default: m.OrganizationsPage })),
);
const RelationshipsPage = React.lazy(() =>
  import("@/modules/crm/pages/relationships-page").then((m) => ({ default: m.RelationshipsPage })),
);
const RelationshipDetailPage = React.lazy(() =>
  import("@/modules/crm/pages/relationship-detail-page").then((m) => ({
    default: m.RelationshipDetailPage,
  })),
);
const PledgesPage = React.lazy(() =>
  import("@/modules/crm/pages/pledges-page").then((m) => ({ default: m.PledgesPage })),
);
const MenuPage = React.lazy(() =>
  import("@/modules/hospitality/pages/menu-page").then((m) => ({ default: m.MenuPage })),
);
const ReservationPage = React.lazy(() =>
  import("@/modules/hospitality/pages/reservation-page").then((m) => ({
    default: m.ReservationPage,
  })),
);
const HospitalityDeskPage = React.lazy(() =>
  import("@/modules/hospitality/pages/desk-page").then((m) => ({
    default: m.HospitalityDeskPage,
  })),
);
const TablesPage = React.lazy(() =>
  import("@/modules/hospitality/pages/tables-page").then((m) => ({ default: m.TablesPage })),
);
const AdminMenuPage = React.lazy(() =>
  import("@/modules/hospitality/pages/admin-menu-page").then((m) => ({
    default: m.AdminMenuPage,
  })),
);
const DashboardPage = React.lazy(() =>
  import("@/modules/analytics/pages/dashboard-page").then((m) => ({ default: m.DashboardPage })),
);
const SendAPigeonPage = React.lazy(() =>
  import("@/modules/site/pages/send-a-pigeon-page").then((m) => ({
    default: m.SendAPigeonPage,
  })),
);
const ContactPage = React.lazy(() =>
  import("@/modules/site/pages/contact-page").then((m) => ({ default: m.ContactPage })),
);
const PigeonSubmissionsPage = React.lazy(() =>
  import("@/modules/publishing/pages/pigeon-submissions-page").then((m) => ({
    default: m.PigeonSubmissionsPage,
  })),
);

function withSuspense(element: React.ReactNode) {
  return <React.Suspense fallback={<div className="p-8">Loading…</div>}>{element}</React.Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      // Named-series routes (spec §3). React Router ranks static path
      // segments above the dynamic ":slug" catch-all further down
      // regardless of declaration order, so these can't collide with a
      // CMS-authored page slug of the same name -- but staff still
      // shouldn't title an institutional page "Record", "Papers", etc.,
      // since that page would simply become unreachable at its own path.
      { path: "papers", element: withSuspense(<PapersIndexPage />) },
      { path: "papers/:slug", element: withSuspense(<PaperPage />) },
      { path: "brief", element: withSuspense(<BriefIndexPage />) },
      { path: "brief/:slug", element: withSuspense(<BriefPage />) },
      { path: "dispatch", element: withSuspense(<DispatchIndexPage />) },
      { path: "dispatch/:slug", element: withSuspense(<DispatchPage />) },
      { path: "pigeon-post", element: withSuspense(<PigeonPostIndexPage />) },
      { path: "pigeon-post/:slug", element: withSuspense(<PigeonPostPage />) },
      { path: "annual", element: withSuspense(<AnnualIndexPage />) },
      { path: "annual/:slug", element: withSuspense(<AnnualPage />) },
      { path: "record", element: withSuspense(<RecordPage />) },
      { path: "menu", element: withSuspense(<MenuPage />) },
      { path: "reservations", element: withSuspense(<ReservationPage />) },
      { path: "send-a-pigeon", element: withSuspense(<SendAPigeonPage />) },
      { path: "contact", element: withSuspense(<ContactPage />) },
      { path: "search", element: withSuspense(<SearchPage />) },
      // The six organs. Four have a dedicated hub component that
      // aggregates related content (Press: the five series; House: Visit;
      // Hearth: Menu + Reservations; The Record: the deposit index); Guild
      // and Treasury fall through to the generic CmsPage catch-all below,
      // same as any other plain institutional page.
      { path: "press", element: withSuspense(<PressPage />) },
      { path: "house", element: withSuspense(<HousePage />) },
      { path: "hearth", element: withSuspense(<HearthPage />) },
      { path: "the-record", element: withSuspense(<RecordOrganPage />) },
      { path: "journal", element: withSuspense(<JournalPage />) },
      { path: "journal/:slug", element: withSuspense(<ArticlePage />) },
      { path: "membership/apply", element: withSuspense(<ApplyPage />) },
      { path: "membership/directory", element: withSuspense(<DirectoryPage />) },
      { path: "membership/accept-invitation", element: withSuspense(<AcceptInvitationPage />) },
      { path: "programmes", element: withSuspense(<CalendarPage />) },
      { path: "programmes/:slug", element: withSuspense(<ProgramPage />) },
      {
        path: "my-registrations",
        element: withSuspense(<ProtectedRoute requireMfa={false} />),
        children: [{ index: true, element: withSuspense(<MyRegistrationsPage />) }],
      },
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
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: "dashboard", element: withSuspense(<DashboardPage />) },
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
            path: "applications",
            element: withSuspense(<ProtectedRoute permission="membership.application.read" />),
            children: [{ index: true, element: withSuspense(<ApplicationsPage />) }],
          },
          {
            path: "members",
            element: withSuspense(<ProtectedRoute permission="membership.member.read" />),
            children: [
              { index: true, element: withSuspense(<MembersPage />) },
              { path: ":id", element: withSuspense(<MemberDetailPage />) },
            ],
          },
          {
            path: "programmes",
            element: withSuspense(<ProtectedRoute permission="programs.program.read" />),
            children: [
              { index: true, element: withSuspense(<AdminProgramsPage />) },
              { path: "new", element: withSuspense(<ProgramEditorPage />) },
              { path: "sessions/:id", element: withSuspense(<SessionRosterPage />) },
              { path: ":id", element: withSuspense(<ProgramEditorPage />) },
            ],
          },
          {
            path: "organizations",
            element: withSuspense(<ProtectedRoute permission="crm.organization.read" />),
            children: [{ index: true, element: withSuspense(<OrganizationsPage />) }],
          },
          {
            path: "relationships",
            element: withSuspense(<ProtectedRoute permission="crm.relationship.read" />),
            children: [
              { index: true, element: withSuspense(<RelationshipsPage />) },
              { path: ":id", element: withSuspense(<RelationshipDetailPage />) },
            ],
          },
          {
            path: "pledges",
            element: withSuspense(<ProtectedRoute permission="crm.pledge.read" />),
            children: [{ index: true, element: withSuspense(<PledgesPage />) }],
          },
          {
            path: "hospitality/desk",
            element: withSuspense(<ProtectedRoute permission="hospitality.reservation.read" />),
            children: [{ index: true, element: withSuspense(<HospitalityDeskPage />) }],
          },
          {
            path: "hospitality/tables",
            element: withSuspense(<ProtectedRoute permission="hospitality.service.manage" />),
            children: [{ index: true, element: withSuspense(<TablesPage />) }],
          },
          {
            path: "hospitality/menu",
            element: withSuspense(<ProtectedRoute permission="hospitality.menu.manage" />),
            children: [{ index: true, element: withSuspense(<AdminMenuPage />) }],
          },
          {
            path: "pigeon-submissions",
            element: withSuspense(<ProtectedRoute permission="publishing.item.read" />),
            children: [{ index: true, element: withSuspense(<PigeonSubmissionsPage />) }],
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
