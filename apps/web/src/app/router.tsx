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
/**
 * A route component loaded on its own chunk. Written once so the router reads
 * as a list of pages, not a wall of dynamic imports. `name` must be an export
 * of the module, and the component must take no required props.
 */
type ComponentKeys<M> = {
  [K in keyof M]: M[K] extends React.ComponentType<never> ? K : never;
}[keyof M];

type LazyOf<C> =
  C extends React.ComponentType<infer P>
    ? React.LazyExoticComponent<React.ComponentType<P>>
    : never;

function lazyPage<M, K extends ComponentKeys<M>>(load: () => Promise<M>, name: K): LazyOf<M[K]> {
  // React.lazy wants ComponentType<any>; the cast is confined here and the
  // component keeps its own prop types on the way out.
  return React.lazy(async () => ({
    default: (await load())[name] as unknown as React.ComponentType,
  })) as unknown as LazyOf<M[K]>;
}

const SignInPage = lazyPage(() => import("@/modules/auth-core/pages/sign-in-page"), "SignInPage");
const MfaEnrollPage = lazyPage(
  () => import("@/modules/auth-core/pages/mfa-enroll-page"),
  "MfaEnrollPage",
);
const AccountPage = lazyPage(() => import("@/modules/auth-core/pages/account-page"), "AccountPage");
const ProtectedRoute = lazyPage(
  () => import("@/modules/auth-core/components/protected-route"),
  "ProtectedRoute",
);
const AdminLayout = lazyPage(
  () => import("@/modules/admin-core/components/admin-layout"),
  "AdminLayout",
);
const DeskPage = lazyPage(() => import("@/modules/publishing/pages/desk-page"), "DeskPage");
const ItemEditorPage = lazyPage(
  () => import("@/modules/publishing/pages/item-editor-page"),
  "ItemEditorPage",
);
const MediaPage = lazyPage(() => import("@/modules/publishing/pages/media-page"), "MediaPage");
const SettingsPage = lazyPage(
  () => import("@/modules/admin-core/pages/settings-page"),
  "SettingsPage",
);
const WordingPage = lazyPage(
  () => import("@/modules/admin-core/pages/wording-page"),
  "WordingPage",
);
const AdminTiersPage = lazyPage(
  () => import("@/modules/membership/pages/admin-tiers-page"),
  "AdminTiersPage",
);
const ArticlePage = lazyPage(() => import("@/modules/site/pages/article-page"), "ArticlePage");
const CmsPage = lazyPage(() => import("@/modules/site/pages/cms-page"), "CmsPage");
const SearchPage = lazyPage(() => import("@/modules/site/pages/search-page"), "SearchPage");
const PressPage = lazyPage(() => import("@/modules/site/pages/press-page"), "PressPage");
const HousePage = lazyPage(() => import("@/modules/site/pages/house-page"), "HousePage");
const HearthPage = lazyPage(() => import("@/modules/site/pages/hearth-page"), "HearthPage");
const GuildPage = lazyPage(() => import("@/modules/site/pages/guild-page"), "GuildPage");
const TreasuryPage = lazyPage(() => import("@/modules/site/pages/treasury-page"), "TreasuryPage");
const RecordOrganPage = lazyPage(
  () => import("@/modules/site/pages/record-organ-page"),
  "RecordOrganPage",
);
const PapersIndexPage = lazyPage(
  () => import("@/modules/site/pages/papers-index-page"),
  "PapersIndexPage",
);
const PaperPage = lazyPage(() => import("@/modules/site/pages/paper-page"), "PaperPage");
const BriefIndexPage = lazyPage(
  () => import("@/modules/site/pages/brief-index-page"),
  "BriefIndexPage",
);
const BriefPage = lazyPage(() => import("@/modules/site/pages/brief-page"), "BriefPage");
const DispatchIndexPage = lazyPage(
  () => import("@/modules/site/pages/dispatch-index-page"),
  "DispatchIndexPage",
);
const DispatchPage = lazyPage(() => import("@/modules/site/pages/dispatch-page"), "DispatchPage");
const PigeonPostIndexPage = lazyPage(
  () => import("@/modules/site/pages/pigeon-post-index-page"),
  "PigeonPostIndexPage",
);
const PigeonPostPage = lazyPage(
  () => import("@/modules/site/pages/pigeon-post-page"),
  "PigeonPostPage",
);
const AnnualIndexPage = lazyPage(
  () => import("@/modules/site/pages/annual-index-page"),
  "AnnualIndexPage",
);
const AnnualPage = lazyPage(() => import("@/modules/site/pages/annual-page"), "AnnualPage");
const RecordPage = lazyPage(() => import("@/modules/site/pages/record-page"), "RecordPage");
const ApplyPage = lazyPage(() => import("@/modules/membership/pages/apply-page"), "ApplyPage");
const DirectoryPage = lazyPage(
  () => import("@/modules/membership/pages/directory-page"),
  "DirectoryPage",
);
const AcceptInvitationPage = lazyPage(
  () => import("@/modules/membership/pages/accept-invitation-page"),
  "AcceptInvitationPage",
);
const ApplicationsPage = lazyPage(
  () => import("@/modules/membership/pages/applications-page"),
  "ApplicationsPage",
);
const MembersPage = lazyPage(
  () => import("@/modules/membership/pages/members-page"),
  "MembersPage",
);
const MemberDetailPage = lazyPage(
  () => import("@/modules/membership/pages/member-detail-page"),
  "MemberDetailPage",
);
const MemberCardPage = lazyPage(
  () => import("@/modules/membership/pages/member-card-page"),
  "MemberCardPage",
);
const VerifyCardPage = lazyPage(
  () => import("@/modules/membership/pages/verify-card-page"),
  "VerifyCardPage",
);
const CalendarPage = lazyPage(
  () => import("@/modules/programs/pages/calendar-page"),
  "CalendarPage",
);
const ProgramPage = lazyPage(() => import("@/modules/programs/pages/program-page"), "ProgramPage");
const MyRegistrationsPage = lazyPage(
  () => import("@/modules/programs/pages/my-registrations-page"),
  "MyRegistrationsPage",
);
const AdminProgramsPage = lazyPage(
  () => import("@/modules/programs/pages/admin-programs-page"),
  "AdminProgramsPage",
);
const ProgramEditorPage = lazyPage(
  () => import("@/modules/programs/pages/program-editor-page"),
  "ProgramEditorPage",
);
const SessionRosterPage = lazyPage(
  () => import("@/modules/programs/pages/session-roster-page"),
  "SessionRosterPage",
);
const OrganizationsPage = lazyPage(
  () => import("@/modules/crm/pages/organizations-page"),
  "OrganizationsPage",
);
const RelationshipsPage = lazyPage(
  () => import("@/modules/crm/pages/relationships-page"),
  "RelationshipsPage",
);
const RelationshipDetailPage = lazyPage(
  () => import("@/modules/crm/pages/relationship-detail-page"),
  "RelationshipDetailPage",
);
const PledgesPage = lazyPage(() => import("@/modules/crm/pages/pledges-page"), "PledgesPage");
const WallPage = lazyPage(() => import("@/modules/site/pages/wall-page"), "WallPage");
const PersonPage = lazyPage(() => import("@/modules/site/pages/person-page"), "PersonPage");
const WorkPage = lazyPage(() => import("@/modules/site/pages/work-page"), "WorkPage");
const ShowPage = lazyPage(() => import("@/modules/site/pages/show-page"), "ShowPage");
const SattalIndexPage = lazyPage(
  () => import("@/modules/site/pages/sattal-pages"),
  "SattalIndexPage",
);
const SattalPiecePage = lazyPage(
  () => import("@/modules/site/pages/sattal-pages"),
  "SattalPiecePage",
);
const ChroniclePage = lazyPage(() => import("@/modules/site/pages/house-pages"), "ChroniclePage");
const WordsPage = lazyPage(() => import("@/modules/site/pages/house-pages"), "WordsPage");
const CommonsPage = lazyPage(() => import("@/modules/site/pages/house-pages"), "CommonsPage");
const CanonIndexPage = lazyPage(() => import("@/modules/site/pages/house-pages"), "CanonIndexPage");
const CanonDocRoute = lazyPage(() => import("@/modules/site/pages/house-pages"), "CanonDocRoute");
const AVoicePage = lazyPage(() => import("@/modules/site/pages/house-pages"), "AVoicePage");
const DepositRoute = lazyPage(() => import("@/modules/site/pages/house-pages"), "DepositRoute");
const NamePage = lazyPage(() => import("@/modules/site/pages/house-pages"), "NamePage");
const TablePage = lazyPage(() => import("@/modules/site/pages/house-pages"), "TablePage");
const LookingForPage = lazyPage(() => import("@/modules/site/pages/house-pages"), "LookingForPage");
const PrivacyPage = lazyPage(() => import("@/modules/site/pages/house-pages"), "PrivacyPage");
const AdminPeoplePage = lazyPage(
  () => import("@/modules/wall/pages/admin-people-page"),
  "AdminPeoplePage",
);
const AdminWorksPage = lazyPage(
  () => import("@/modules/wall/pages/admin-works-page"),
  "AdminWorksPage",
);
const AdminShowsPage = lazyPage(
  () => import("@/modules/wall/pages/admin-shows-page"),
  "AdminShowsPage",
);
const AdminSattalPage = lazyPage(
  () => import("@/modules/wall/pages/admin-sattal-page"),
  "AdminSattalPage",
);
const AdminChroniclePage = lazyPage(
  () => import("@/modules/wall/pages/admin-chronicle-page"),
  "AdminChroniclePage",
);
const AdminVoicePage = lazyPage(
  () => import("@/modules/wall/pages/admin-misc-pages"),
  "AdminVoicePage",
);
const AdminGlossaryPage = lazyPage(
  () => import("@/modules/wall/pages/admin-misc-pages"),
  "AdminGlossaryPage",
);
const TermsIndexPage = lazyPage(() => import("@/modules/site/pages/more-pages"), "TermsIndexPage");
const TermsDocPage = lazyPage(() => import("@/modules/site/pages/more-pages"), "TermsDocPage");
const HandsPage = lazyPage(() => import("@/modules/site/pages/more-pages"), "HandsPage");
const HandPage = lazyPage(() => import("@/modules/site/pages/more-pages"), "HandPage");
const EncountersPage = lazyPage(() => import("@/modules/site/pages/more-pages"), "EncountersPage");
const EncounterPage = lazyPage(() => import("@/modules/site/pages/more-pages"), "EncounterPage");
const SafeguardingPage = lazyPage(
  () => import("@/modules/site/pages/more-pages"),
  "SafeguardingPage",
);
const ChildrenPhotographyPage = lazyPage(
  () => import("@/modules/site/pages/more-pages"),
  "ChildrenPhotographyPage",
);
const BriefConfirmPage = lazyPage(
  () => import("@/modules/site/pages/more-pages"),
  "BriefConfirmPage",
);
const BriefUnsubscribePage = lazyPage(
  () => import("@/modules/site/pages/more-pages"),
  "BriefUnsubscribePage",
);
const CustodianPage = lazyPage(() => import("@/modules/site/pages/house-pages"), "CustodianPage");
const FriendsTermsNote = lazyPage(
  () => import("@/modules/site/pages/more-pages"),
  "FriendsTermsNote",
);
const AdminRolesPage = lazyPage(
  () => import("@/modules/wall/pages/admin-house-pages"),
  "AdminRolesPage",
);
const AdminEncountersPage = lazyPage(
  () => import("@/modules/wall/pages/admin-house-pages"),
  "AdminEncountersPage",
);
const AdminTreasuryPage = lazyPage(
  () => import("@/modules/wall/pages/admin-house-pages"),
  "AdminTreasuryPage",
);
const AdminGuildPage = lazyPage(
  () => import("@/modules/wall/pages/admin-house-pages"),
  "AdminGuildPage",
);
const AdminCommonsPage = lazyPage(
  () => import("@/modules/wall/pages/admin-house-pages"),
  "AdminCommonsPage",
);
const AdminConcernsPage = lazyPage(
  () => import("@/modules/wall/pages/admin-house-pages"),
  "AdminConcernsPage",
);
const AdminDealingsPage = lazyPage(
  () => import("@/modules/wall/pages/admin-dealings-page"),
  "AdminDealingsPage",
);
const CertificatePage = lazyPage(
  () => import("@/modules/wall/pages/admin-dealings-page"),
  "CertificatePage",
);
const InvoicePage = lazyPage(
  () => import("@/modules/wall/pages/admin-dealings-page"),
  "InvoicePage",
);
const AdminBriefPage = lazyPage(
  () => import("@/modules/wall/pages/admin-brief-page"),
  "AdminBriefPage",
);
const DashboardPage = lazyPage(
  () => import("@/modules/analytics/pages/dashboard-page"),
  "DashboardPage",
);
const SendAPigeonPage = lazyPage(
  () => import("@/modules/site/pages/send-a-pigeon-page"),
  "SendAPigeonPage",
);
const ResolveNotFoundPage = lazyPage(
  () => import("@/modules/site/pages/resolve-not-found-page"),
  "ResolveNotFoundPage",
);
const ContactPage = lazyPage(() => import("@/modules/site/pages/contact-page"), "ContactPage");
const PigeonSubmissionsPage = lazyPage(
  () => import("@/modules/publishing/pages/pigeon-submissions-page"),
  "PigeonSubmissionsPage",
);

const RoomsPage = lazyPage(() => import("@/modules/site/pages/place-pages"), "RoomsPage");
const RoomRoute = lazyPage(() => import("@/modules/site/pages/place-pages"), "RoomRoute");
const ThingsPage = lazyPage(() => import("@/modules/site/pages/place-pages"), "ThingsPage");
const ReadingRoomPage = lazyPage(
  () => import("@/modules/site/pages/place-pages"),
  "ReadingRoomPage",
);
const TheYearPage = lazyPage(() => import("@/modules/site/pages/place-pages"), "TheYearPage");
const AtTheHousePage = lazyPage(() => import("@/modules/site/pages/place-pages"), "AtTheHousePage");
const FindingTheHousePage = lazyPage(
  () => import("@/modules/site/pages/place-pages"),
  "FindingTheHousePage",
);
const NeighboursPage = lazyPage(() => import("@/modules/site/pages/place-pages"), "NeighboursPage");
const CataloguePage = lazyPage(
  () => import("@/modules/site/pages/record-catalogue-pages"),
  "CataloguePage",
);
const HousePapersPage = lazyPage(
  () => import("@/modules/site/pages/record-catalogue-pages"),
  "HousePapersPage",
);
const VerifyPage = lazyPage(() => import("@/modules/site/pages/verify-pages"), "VerifyPage");
const VerifyWorkPage = lazyPage(
  () => import("@/modules/site/pages/verify-pages"),
  "VerifyWorkPage",
);
const PigeonWherePage = lazyPage(
  () => import("@/modules/site/pages/reach-pages"),
  "PigeonWherePage",
);
const ObjectsPage = lazyPage(() => import("@/modules/site/pages/reach-pages"), "ObjectsPage");
const PlacesIndexPage = lazyPage(
  () => import("@/modules/site/pages/reach-pages"),
  "PlacesIndexPage",
);
const PlaceRoute = lazyPage(() => import("@/modules/site/pages/reach-pages"), "PlaceRoute");
const AfternoonsRoute = lazyPage(
  () => import("@/modules/site/pages/reach-pages"),
  "AfternoonsRoute",
);
const WallOfferPage = lazyPage(() => import("@/modules/site/pages/offer-pages"), "WallOfferPage");
const SattalWritingPage = lazyPage(
  () => import("@/modules/site/pages/offer-pages"),
  "SattalWritingPage",
);
const TableElsewherePage = lazyPage(
  () => import("@/modules/site/pages/offer-pages"),
  "TableElsewherePage",
);
const LeavingPage = lazyPage(() => import("@/modules/site/pages/offer-pages"), "LeavingPage");

const SectionLayout = lazyPage(
  () => import("@/modules/wall/components/section-layout"),
  "SectionLayout",
);
const AdminHouseTodayPage = lazyPage(
  () => import("@/modules/wall/pages/admin-place-pages"),
  "AdminHouseTodayPage",
);
const AdminRoomsPage = lazyPage(
  () => import("@/modules/wall/pages/admin-place-pages"),
  "AdminRoomsPage",
);
const AdminThingsPage = lazyPage(
  () => import("@/modules/wall/pages/admin-place-pages"),
  "AdminThingsPage",
);
const AdminWantedPage = lazyPage(
  () => import("@/modules/wall/pages/admin-place-pages"),
  "AdminWantedPage",
);
const AdminBooksPage = lazyPage(
  () => import("@/modules/wall/pages/admin-place-pages"),
  "AdminBooksPage",
);
const AdminStudioPage = lazyPage(
  () => import("@/modules/wall/pages/admin-place-pages"),
  "AdminStudioPage",
);
const AdminDaysPage = lazyPage(
  () => import("@/modules/wall/pages/admin-place-pages"),
  "AdminDaysPage",
);
const AdminCataloguePage = lazyPage(
  () => import("@/modules/wall/pages/admin-record-pages"),
  "AdminCataloguePage",
);
const AdminHousePapersPage = lazyPage(
  () => import("@/modules/wall/pages/admin-record-pages"),
  "AdminHousePapersPage",
);
const AdminOffersPage = lazyPage(
  () => import("@/modules/wall/pages/admin-offers-page"),
  "AdminOffersPage",
);
const AdminPlacesPage = lazyPage(
  () => import("@/modules/wall/pages/admin-press-pages"),
  "AdminPlacesPage",
);
const AdminPigeonReachPage = lazyPage(
  () => import("@/modules/wall/pages/admin-press-pages"),
  "AdminPigeonReachPage",
);
const AdminObjectsPage = lazyPage(
  () => import("@/modules/wall/pages/admin-press-pages"),
  "AdminObjectsPage",
);

function withSuspense(element: React.ReactNode) {
  return (
    <React.Suspense
      fallback={
        <div role="status" className="p-8">
          Loading…
        </div>
      }
    >
      {element}
    </React.Suspense>
  );
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
    { path: "pigeon-post/where", element: withSuspense(<PigeonWherePage />) },
    { path: "pigeon-post/:slug", element: withSuspense(<PigeonPostPage />) },
    { path: "annual", element: withSuspense(<AnnualIndexPage />) },
    { path: "annual/:slug", element: withSuspense(<AnnualPage />) },
    { path: "record", element: withSuspense(<RecordOrganPage />) },
    { path: "record/deposits", element: withSuspense(<RecordPage />) },
    { path: "record/catalogue", element: withSuspense(<CataloguePage />) },
    { path: "record/papers", element: withSuspense(<HousePapersPage />) },
    { path: "record/offer", element: withSuspense(<AVoicePage />) },
    { path: "wall", element: withSuspense(<WallPage />) },
    { path: "wall/offer", element: withSuspense(<WallOfferPage />) },
    { path: "people/:slug", element: withSuspense(<PersonPage />) },
    { path: "works/:slug", element: withSuspense(<WorkPage />) },
    { path: "shows/:slug", element: withSuspense(<ShowPage />) },
    { path: "sattal", element: withSuspense(<SattalIndexPage />) },
    { path: "sattal/writing", element: withSuspense(<SattalWritingPage />) },
    { path: "sattal/:slug", element: withSuspense(<SattalPiecePage />) },
    { path: "chronicle", element: withSuspense(<ChroniclePage />) },
    { path: "words", element: withSuspense(<WordsPage />) },
    { path: "record/:deposit", element: withSuspense(<DepositRoute />) },
    { path: "name", element: withSuspense(<NamePage />) },
    { path: "table", element: withSuspense(<TablePage />) },
    { path: "table/elsewhere", element: withSuspense(<TableElsewherePage />) },
    { path: "commons", element: withSuspense(<CommonsPage />) },
    {
      path: "friends",
      element: (
        <>
          {withSuspense(<ApplyPage />)}
          {withSuspense(<FriendsTermsNote />)}
        </>
      ),
    },
    { path: "encounters", element: withSuspense(<EncountersPage />) },
    { path: "encounters/places", element: withSuspense(<PlacesIndexPage />) },
    { path: "encounters/places/:slug", element: withSuspense(<PlaceRoute />) },
    { path: "encounters/:slug", element: withSuspense(<EncounterPage />) },
    { path: "afternoons/:series", element: withSuspense(<AfternoonsRoute />) },
    { path: "canon", element: withSuspense(<CanonIndexPage />) },
    { path: "canon/:doc", element: withSuspense(<CanonDocRoute />) },
    { path: "looking-for", element: withSuspense(<LookingForPage />) },
    { path: "privacy", element: withSuspense(<PrivacyPage />) },
    { path: "terms", element: withSuspense(<TermsIndexPage />) },
    { path: "terms/:kind", element: withSuspense(<TermsDocPage />) },
    { path: "hands", element: withSuspense(<HandsPage />) },
    { path: "hands/:slug", element: withSuspense(<HandPage />) },
    { path: "safeguarding", element: withSuspense(<SafeguardingPage />) },
    { path: "safeguarding/children", element: withSuspense(<ChildrenPhotographyPage />) },
    { path: "custodian", element: withSuspense(<CustodianPage />) },
    { path: "brief/confirm", element: withSuspense(<BriefConfirmPage />) },
    { path: "brief/unsubscribe", element: withSuspense(<BriefUnsubscribePage />) },
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
    { path: "house/rooms", element: withSuspense(<RoomsPage />) },
    { path: "house/rooms/:slug", element: withSuspense(<RoomRoute />) },
    { path: "house/things", element: withSuspense(<ThingsPage />) },
    { path: "reading-room", element: withSuspense(<ReadingRoomPage />) },
    { path: "the-year", element: withSuspense(<TheYearPage />) },
    { path: "at-the-house", element: withSuspense(<AtTheHousePage />) },
    { path: "finding-the-house", element: withSuspense(<FindingTheHousePage />) },
    { path: "neighbours", element: withSuspense(<NeighboursPage />) },
    { path: "objects", element: withSuspense(<ObjectsPage />) },
    { path: "leaving", element: withSuspense(<LeavingPage />) },
    { path: "verify", element: withSuspense(<VerifyPage />) },
    { path: "verify/work/:number", element: withSuspense(<VerifyWorkPage />) },
    { path: "hearth", element: withSuspense(<HearthPage />) },
    { path: "guild", element: withSuspense(<GuildPage />) },
    { path: "treasury", element: withSuspense(<TreasuryPage />) },
    // The organ took /record and the deposit index moved to /record/deposits
    // (Build Programme 2.4). Every old address redirects, permanently.
    { path: "the-record", element: <Navigate to="/record" replace /> },
    // /visit promised hours, against the rule that a house which is a home
    // keeps none (Build Programme 2.3).
    { path: "visit", element: <Navigate to="/wall" replace /> },
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
            path: "hands",
            element: withSuspense(<ProtectedRoute permission="governance.manage" />),
            children: [{ index: true, element: withSuspense(<AdminRolesPage />) }],
          },
          {
            path: "encounters",
            element: withSuspense(<ProtectedRoute permission="encounters.manage" />),
            children: [{ index: true, element: withSuspense(<AdminEncountersPage />) }],
          },
          {
            path: "treasury",
            element: withSuspense(<ProtectedRoute permission="treasury.manage" />),
            children: [{ index: true, element: withSuspense(<AdminTreasuryPage />) }],
          },
          {
            path: "guild",
            element: withSuspense(<ProtectedRoute permission="guild.manage" />),
            children: [{ index: true, element: withSuspense(<AdminGuildPage />) }],
          },
          {
            path: "commons",
            element: withSuspense(<ProtectedRoute permission="commons.manage" />),
            children: [{ index: true, element: withSuspense(<AdminCommonsPage />) }],
          },
          {
            path: "concerns",
            element: withSuspense(<ProtectedRoute permission="safeguarding.read" />),
            children: [{ index: true, element: withSuspense(<AdminConcernsPage />) }],
          },
          {
            path: "wall/dealings",
            element: withSuspense(<ProtectedRoute permission="wall.manage" />),
            children: [{ index: true, element: withSuspense(<AdminDealingsPage />) }],
          },
          {
            path: "wall/certificate/:workId",
            element: withSuspense(<ProtectedRoute permission="wall.manage" />),
            children: [{ index: true, element: withSuspense(<CertificatePage />) }],
          },
          {
            path: "wall/invoice/:id",
            element: withSuspense(<ProtectedRoute permission="wall.manage" />),
            children: [{ index: true, element: withSuspense(<InvoicePage />) }],
          },
          {
            path: "brief",
            element: withSuspense(<ProtectedRoute permission="mail.manage" />),
            children: [{ index: true, element: withSuspense(<AdminBriefPage />) }],
          },
          {
            path: "pigeon-submissions",
            element: withSuspense(<ProtectedRoute permission="publishing.item.read" />),
            children: [{ index: true, element: withSuspense(<PigeonSubmissionsPage />) }],
          },
          {
            path: "house",
            element: withSuspense(<ProtectedRoute permission="house.manage" />),
            children: [
              {
                element: withSuspense(
                  <SectionLayout
                    title="The house"
                    intro="The house as a place: its rooms, the things in them, what it would welcome, its shelves, who is making in the studio, and the days it keeps."
                    tabs={[
                      { to: "/admin/house/rooms", label: "Rooms" },
                      { to: "/admin/house/things", label: "Things" },
                      { to: "/admin/house/wanted", label: "Would welcome" },
                      { to: "/admin/house/books", label: "Reading room" },
                      { to: "/admin/house/studio", label: "Studio" },
                      { to: "/admin/house/days", label: "The year" },
                      { to: "/admin/house/today", label: "Today" },
                    ]}
                  />,
                ),
                children: [
                  { index: true, element: <Navigate to="/admin/house/rooms" replace /> },
                  { path: "rooms", element: withSuspense(<AdminRoomsPage />) },
                  { path: "things", element: withSuspense(<AdminThingsPage />) },
                  { path: "wanted", element: withSuspense(<AdminWantedPage />) },
                  { path: "books", element: withSuspense(<AdminBooksPage />) },
                  { path: "studio", element: withSuspense(<AdminStudioPage />) },
                  { path: "days", element: withSuspense(<AdminDaysPage />) },
                  { path: "today", element: withSuspense(<AdminHouseTodayPage />) },
                ],
              },
            ],
          },
          {
            path: "record",
            element: withSuspense(<ProtectedRoute permission="record.manage" />),
            children: [
              {
                element: withSuspense(
                  <SectionLayout
                    title="The Record"
                    intro="The catalogue of what was given in, and the house's own papers. What the Press has published is kept in the deposit register."
                    tabs={[
                      { to: "/admin/record/catalogue", label: "Catalogue" },
                      { to: "/admin/record/papers", label: "The house's papers" },
                    ]}
                  />,
                ),
                children: [
                  { index: true, element: <Navigate to="/admin/record/catalogue" replace /> },
                  { path: "catalogue", element: withSuspense(<AdminCataloguePage />) },
                  { path: "papers", element: withSuspense(<AdminHousePapersPage />) },
                ],
              },
            ],
          },
          { path: "offers", element: withSuspense(<AdminOffersPage />) },
          {
            path: "places",
            element: withSuspense(<ProtectedRoute permission="encounters.manage" />),
            children: [{ index: true, element: withSuspense(<AdminPlacesPage />) }],
          },
          {
            path: "pigeon-reach",
            element: withSuspense(<ProtectedRoute permission="publishing.item.update" />),
            children: [{ index: true, element: withSuspense(<AdminPigeonReachPage />) }],
          },
          {
            path: "objects",
            element: withSuspense(<ProtectedRoute permission="publishing.item.update" />),
            children: [{ index: true, element: withSuspense(<AdminObjectsPage />) }],
          },
          {
            path: "wording",
            element: withSuspense(<ProtectedRoute permission="site.wording.manage" />),
            children: [{ index: true, element: withSuspense(<WordingPage />) }],
          },
          {
            path: "tiers",
            element: withSuspense(<ProtectedRoute permission="membership.tier.manage" />),
            children: [{ index: true, element: withSuspense(<AdminTiersPage />) }],
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
