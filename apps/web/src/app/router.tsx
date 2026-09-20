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
const AccountPage = React.lazy(() =>
  import("@/modules/auth-core/pages/account-page").then((m) => ({ default: m.AccountPage })),
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
const GuildPage = React.lazy(() =>
  import("@/modules/site/pages/guild-page").then((m) => ({ default: m.GuildPage })),
);
const TreasuryPage = React.lazy(() =>
  import("@/modules/site/pages/treasury-page").then((m) => ({ default: m.TreasuryPage })),
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
const MemberCardPage = React.lazy(() =>
  import("@/modules/membership/pages/member-card-page").then((m) => ({
    default: m.MemberCardPage,
  })),
);
const VerifyCardPage = React.lazy(() =>
  import("@/modules/membership/pages/verify-card-page").then((m) => ({
    default: m.VerifyCardPage,
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
const WallPage = React.lazy(() =>
  import("@/modules/site/pages/wall-page").then((m) => ({ default: m.WallPage })),
);
const PersonPage = React.lazy(() =>
  import("@/modules/site/pages/person-page").then((m) => ({ default: m.PersonPage })),
);
const WorkPage = React.lazy(() =>
  import("@/modules/site/pages/work-page").then((m) => ({ default: m.WorkPage })),
);
const ShowPage = React.lazy(() =>
  import("@/modules/site/pages/show-page").then((m) => ({ default: m.ShowPage })),
);
const SattalIndexPage = React.lazy(() =>
  import("@/modules/site/pages/sattal-pages").then((m) => ({ default: m.SattalIndexPage })),
);
const SattalPiecePage = React.lazy(() =>
  import("@/modules/site/pages/sattal-pages").then((m) => ({ default: m.SattalPiecePage })),
);
const ChroniclePage = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.ChroniclePage })),
);
const WordsPage = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.WordsPage })),
);
const CommonsPage = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.CommonsPage })),
);
const CanonIndexPage = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.CanonIndexPage })),
);
const CanonDocRoute = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.CanonDocRoute })),
);
const AVoicePage = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.AVoicePage })),
);
const DepositRoute = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.DepositRoute })),
);
const NamePage = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.NamePage })),
);
const TablePage = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.TablePage })),
);
const EncountersPage = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.EncountersPage })),
);
const LookingForPage = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.LookingForPage })),
);
const PrivacyPage = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = React.lazy(() =>
  import("@/modules/site/pages/house-pages").then((m) => ({ default: m.TermsPage })),
);
const AdminPeoplePage = React.lazy(() =>
  import("@/modules/wall/pages/admin-people-page").then((m) => ({ default: m.AdminPeoplePage })),
);
const AdminWorksPage = React.lazy(() =>
  import("@/modules/wall/pages/admin-works-page").then((m) => ({ default: m.AdminWorksPage })),
);
const AdminShowsPage = React.lazy(() =>
  import("@/modules/wall/pages/admin-shows-page").then((m) => ({ default: m.AdminShowsPage })),
);
const AdminSattalPage = React.lazy(() =>
  import("@/modules/wall/pages/admin-sattal-page").then((m) => ({ default: m.AdminSattalPage })),
);
const AdminChroniclePage = React.lazy(() =>
  import("@/modules/wall/pages/admin-chronicle-page").then((m) => ({
    default: m.AdminChroniclePage,
  })),
);
const AdminVoicePage = React.lazy(() =>
  import("@/modules/wall/pages/admin-misc-pages").then((m) => ({ default: m.AdminVoicePage })),
);
const AdminGlossaryPage = React.lazy(() =>
  import("@/modules/wall/pages/admin-misc-pages").then((m) => ({ default: m.AdminGlossaryPage })),
);
const DashboardPage = React.lazy(() =>
  import("@/modules/analytics/pages/dashboard-page").then((m) => ({ default: m.DashboardPage })),
);
const SendAPigeonPage = React.lazy(() =>
  import("@/modules/site/pages/send-a-pigeon-page").then((m) => ({
    default: m.SendAPigeonPage,
  })),
);
const ResolveNotFoundPage = React.lazy(() =>
  import("@/modules/site/pages/resolve-not-found-page").then((m) => ({
    default: m.ResolveNotFoundPage,
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

/**
 * The whole public route tree, generated once and mounted twice (English
 * at "/", Nepali at "/ne") -- work plan Part III, #17: "Nepali has no
 * URL... a Nepali reading of a Paper cannot be linked, shared, indexed,
 * archived, or cited." Every route (including transactional ones like
 * /send-a-pigeon that have no translated content of their own) gets a /ne
 * counterpart rather than picking and choosing, so every existing
 * internal link keeps working once uniformly lang-prefixed
 * (useLocalizedPath) -- classifying "content" vs "chrome" routes here
 * would just be a second place those two lists could drift apart. UI
 * chrome (nav labels, buttons) stays English-only under both prefixes,
 * per the standing decision to defer full bilingual chrome -- only
 * content fields (title_ne, body_ne, …) actually render in Nepali.
 */
function publicRouteChildren() {
  return [
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
    { path: "wall", element: withSuspense(<WallPage />) },
    { path: "people/:slug", element: withSuspense(<PersonPage />) },
    { path: "works/:slug", element: withSuspense(<WorkPage />) },
    { path: "shows/:slug", element: withSuspense(<ShowPage />) },
    { path: "sattal", element: withSuspense(<SattalIndexPage />) },
    { path: "sattal/:slug", element: withSuspense(<SattalPiecePage />) },
    { path: "chronicle", element: withSuspense(<ChroniclePage />) },
    { path: "words", element: withSuspense(<WordsPage />) },
    { path: "record/:deposit", element: withSuspense(<DepositRoute />) },
    { path: "name", element: withSuspense(<NamePage />) },
    { path: "table", element: withSuspense(<TablePage />) },
    { path: "commons", element: withSuspense(<CommonsPage />) },
    { path: "friends", element: withSuspense(<ApplyPage />) },
    { path: "encounters", element: withSuspense(<EncountersPage />) },
    { path: "canon", element: withSuspense(<CanonIndexPage />) },
    { path: "canon/:doc", element: withSuspense(<CanonDocRoute />) },
    { path: "looking-for", element: withSuspense(<LookingForPage />) },
    { path: "privacy", element: withSuspense(<PrivacyPage />) },
    { path: "terms", element: withSuspense(<TermsPage />) },
    { path: "a-voice", element: withSuspense(<AVoicePage />) },
    { path: "send-a-pigeon", element: withSuspense(<SendAPigeonPage />) },
    { path: "contact", element: withSuspense(<ContactPage />) },
    { path: "search", element: withSuspense(<SearchPage />) },
    // The six organs, all shown alike (site audit, 18 Sept 2026: Guild
    // and Treasury used to fall through the generic CmsPage catch-all
    // below while the other four had a dedicated component). Press,
    // House, Hearth, and The Record additionally aggregate related
    // content of their own (the five series; the deposit index) -- Guild and Treasury don't need that, just the
    // same organ-page treatment (DocumentHead, the "An organ of the
    // house" kicker, translation-notice handling).
    { path: "press", element: withSuspense(<PressPage />) },
    { path: "house", element: withSuspense(<HousePage />) },
    { path: "hearth", element: withSuspense(<HearthPage />) },
    { path: "guild", element: withSuspense(<GuildPage />) },
    { path: "treasury", element: withSuspense(<TreasuryPage />) },
    { path: "the-record", element: withSuspense(<RecordOrganPage />) },
    // The Journal became the Chronicle (Build Specification 9). Its old
    // address is kept; individual articles keep theirs.
    { path: "journal", element: <Navigate to="/chronicle" replace /> },
    { path: "journal/:slug", element: withSuspense(<ArticlePage />) },
    { path: "membership/apply", element: <Navigate to="/friends" replace /> },
    { path: "membership/directory", element: withSuspense(<DirectoryPage />) },
    { path: "membership/accept-invitation", element: withSuspense(<AcceptInvitationPage />) },
    {
      path: "membership/card",
      element: withSuspense(<ProtectedRoute requireMfa={false} />),
      children: [{ index: true, element: withSuspense(<MemberCardPage />) }],
    },
    { path: "programmes", element: withSuspense(<CalendarPage />) },
    { path: "programmes/:slug", element: withSuspense(<ProgramPage />) },
    {
      path: "my-registrations",
      element: withSuspense(<ProtectedRoute requireMfa={false} />),
      children: [{ index: true, element: withSuspense(<MyRegistrationsPage />) }],
    },
    {
      path: "account",
      element: withSuspense(<ProtectedRoute requireMfa={false} />),
      children: [{ index: true, element: withSuspense(<AccountPage />) }],
    },
    { path: "sign-in", element: withSuspense(<SignInPage />) },
    // CMS-controlled top-level pages (/about, /visit, …). Static routes
    // above always win route ranking over this dynamic segment.
    { path: ":slug", element: withSuspense(<CmsPage />) },
    // Anything with more than one path segment that didn't match a route
    // above (":slug" only ever matches exactly one segment). Rendered
    // inside PublicLayout on purpose, so a broken link still gets the
    // site's real header/footer instead of a bare page.
    { path: "*", element: withSuspense(<ResolveNotFoundPage />) },
  ];
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout lang="en" />,
    children: publicRouteChildren(),
  },
  {
    path: "ne",
    element: <PublicLayout lang="ne" />,
    children: publicRouteChildren(),
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
              { path: "verify-card", element: withSuspense(<VerifyCardPage />) },
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
            path: "wall/people",
            element: withSuspense(<ProtectedRoute permission="wall.manage" />),
            children: [{ index: true, element: withSuspense(<AdminPeoplePage />) }],
          },
          {
            path: "wall/works",
            element: withSuspense(<ProtectedRoute permission="wall.manage" />),
            children: [{ index: true, element: withSuspense(<AdminWorksPage />) }],
          },
          {
            path: "wall/shows",
            element: withSuspense(<ProtectedRoute permission="wall.manage" />),
            children: [{ index: true, element: withSuspense(<AdminShowsPage />) }],
          },
          {
            path: "sattal",
            element: withSuspense(<ProtectedRoute permission="sattal.manage" />),
            children: [{ index: true, element: withSuspense(<AdminSattalPage />) }],
          },
          {
            path: "chronicle",
            element: withSuspense(<ProtectedRoute permission="chronicle.line.create" />),
            children: [{ index: true, element: withSuspense(<AdminChroniclePage />) }],
          },
          {
            path: "voice",
            element: withSuspense(<ProtectedRoute permission="crm.voice.read" />),
            children: [{ index: true, element: withSuspense(<AdminVoicePage />) }],
          },
          {
            path: "words",
            element: withSuspense(<ProtectedRoute permission="publishing.item.update" />),
            children: [{ index: true, element: withSuspense(<AdminGlossaryPage />) }],
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
  // Non-public, non-matched paths only (e.g. a bad /admin/* link) --
  // everything under the public layout is handled by its own "*" above.
  { path: "*", element: <Navigate to="/" replace /> },
]);
