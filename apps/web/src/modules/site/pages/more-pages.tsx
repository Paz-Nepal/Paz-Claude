import * as React from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Field, Input, RichText, StatePanel, Textarea, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatMoney } from "@paz/utils";
import { usePublishedItem } from "../api/use-site";
import {
  TERMS_KINDS,
  currentTerms,
  useBriefToken,
  useEncounter,
  useEncountersCalendar,
  useHands,
  useGuildRegister,
  useSubmitConcern,
  useTermsVersions,
  useTreasuryAccounts,
  type Encounter,
} from "../api/use-house";
import { useSattalReaders } from "../api/use-wall";
import { useEmptyState } from "../empty-states";
import { useWording, type WordingKey } from "../wording";
import { pickLang, pickLangDoc, useLanguage, useLocalizedPath } from "../language";
import { DocumentHead } from "../components/document-head";
import { PageHero } from "../components/paz-editorial";
import { DepositProvenance } from "../components/deposit-provenance";
import { FormUnavailable, isUnavailable, useEraDate } from "../components/wall-parts";
import { NotFoundPage } from "./not-found-page";
import { ShellPage } from "./house-pages";

// ---------------------------------------------------------------------
// The four terms documents (Build Programme 4). Each is a deposited
// document with a version history, because terms that change silently are
// worse than no terms. The words are the house's; the pages exist and say
// so plainly until they are deposited.
// ---------------------------------------------------------------------
const TERMS_LABEL: Record<string, WordingKey> = {
  painters: "terms.painters",
  writers: "terms.writers",
  memory: "terms.memory",
  friends: "terms.friends",
};

export function TermsIndexPage() {
  const versions = useTermsVersions();
  const localize = useLocalizedPath();
  const w = useWording();
  const empty = useEmptyState();
  return (
    <ShellPage slug="terms" title={w("title.terms")}>
      <section
        className="w-reading border-border border-t py-10"
        aria-label={w("terms.list-label")}
      >
        <ul className="flex flex-col gap-4">
          {TERMS_KINDS.map((kind) => {
            const cur = currentTerms(versions.data, kind);
            return (
              <li key={kind}>
                {cur ? (
                  <Link
                    to={localize(`/terms/${kind}`)}
                    className="link-underline font-serif text-xl"
                  >
                    {w(TERMS_LABEL[kind] as WordingKey)}
                  </Link>
                ) : (
                  <>
                    <span className="font-serif text-xl">{w(TERMS_LABEL[kind] as WordingKey)}</span>
                    {versions.isSuccess && <p className="type-small">{empty("terms")}</p>}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </ShellPage>
  );
}

/**
 * One terms document. `kind` alone shows the current version. A version
 * slug (painters-v2) shows that version and redirects to its deposit
 * number, the canonical address (Build Specification 4.10).
 */
export function TermsDocPage({
  slug: slugProp,
  canonical,
}: {
  slug?: string;
  canonical?: boolean;
}) {
  const params = useParams<{ kind: string }>();
  const raw = slugProp ?? params.kind ?? "";
  const kind = /^(painters|writers|memory|friends)/.exec(raw)?.[1] ?? "";
  const versions = useTermsVersions();
  const localize = useLocalizedPath();
  const { lang } = useLanguage();
  const eraDate = useEraDate();
  const w = useWording();
  const empty = useEmptyState();

  const isKindOnly = raw === kind;
  const cur = currentTerms(versions.data, kind);
  const slug = isKindOnly && !canonical ? cur?.slug : raw;
  const item = usePublishedItem("terms", slug ?? undefined);

  if (!kind) return <NotFoundPage />;
  if (versions.isPending || (Boolean(slug) && item.isPending)) {
    return (
      <p role="status" className="type-small p-16 text-center">
        {w("common.loading")}
      </p>
    );
  }
  if (versions.isError) {
    return (
      <div className="p-16">
        <StatePanel
          title={w("common.load-error")}
          description={toAppError(versions.error).message}
        />
      </div>
    );
  }

  const labelKey = TERMS_LABEL[kind];
  const label = labelKey ? w(labelKey) : w("terms.series");
  if (!slug || !item.data) {
    return (
      <div>
        <DocumentHead title={label} path={`/terms/${kind}`} />
        <PageHero title={label} />
        <p className="w-reading type-body py-12">{empty("terms")}</p>
      </div>
    );
  }

  const d = item.data;
  if (!isKindOnly && !canonical && d.deposit_ref) {
    return <Navigate to={localize(`/record/${d.deposit_ref}`)} replace />;
  }
  const mine = (versions.data ?? []).find((v) => v.slug === slug);
  const earlier = (versions.data ?? []).filter((v) => v.kind === kind && v.slug !== slug);
  const newer = cur && mine && (cur.version ?? 0) > (mine.version ?? 0) ? cur : null;
  const body = pickLangDoc(d.body, d.body_ne, lang) as RichTextNode | null;

  return (
    <article>
      <DocumentHead
        title={pickLang(d.title ?? label, d.title_ne, lang)}
        path={isKindOnly && !canonical ? `/terms/${kind}` : `/terms/${slug}`}
        ogType="article"
        depositRef={d.deposit_ref}
        seriesName={w("terms.series")}
      />
      <PageHero title={pickLang(d.title ?? label, d.title_ne, lang)} />
      <div className="w-reading flex flex-col gap-6 py-12">
        {newer && (
          <p className="type-small">
            {w("terms.newer")}{" "}
            <Link
              to={localize(newer.deposit_ref ? `/record/${newer.deposit_ref}` : `/terms/${kind}`)}
              className="link-underline"
            >
              {w("terms.read-current")}
            </Link>
            .
          </p>
        )}
        {body && <RichText doc={body} className="rich-text" />}
        <p className="type-small">
          {w("terms.version", { version: mine?.version ?? 1 })}
          {d.published_at ? `, ${w("terms.deposited", { date: eraDate(d.published_at) })}` : ""}.
        </p>
        <DepositProvenance
          depositRef={d.deposit_ref}
          title={d.title ?? label}
          series={w("terms.series")}
        />
        {earlier.length > 0 && (
          <section aria-labelledby="terms-history">
            <h2 id="terms-history" className="type-h4">
              {w("terms.history")}
            </h2>
            <ul className="type-body mt-2 flex flex-col gap-1">
              {earlier.map((v) => (
                <li key={v.slug}>
                  <Link
                    to={localize(v.deposit_ref ? `/record/${v.deposit_ref}` : `/terms/${v.slug}`)}
                    className="link-underline"
                  >
                    {w("terms.version", { version: v.version })}
                  </Link>
                  <span className="type-small">
                    {v.published_at ? ` · ${eraDate(v.published_at)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}

/** A link to a terms document, placed at the point of asking. */
export function TermsLink({ kind, children }: { kind: string; children: React.ReactNode }) {
  const localize = useLocalizedPath();
  return (
    <Link to={localize(`/terms/${kind}`)} className="link-underline">
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------
// Hands: every named role in the house, who holds it, and which are open.
// The Sattal already names its outside reader because the rule is worth
// nothing if the reader is anonymous. This generalises it.
// ---------------------------------------------------------------------
const STATUS_LABEL: Record<string, WordingKey> = {
  held: "hands.held",
  open: "hands.open",
  dormant: "hands.dormant",
};

export function HandsPage() {
  const hands = useHands();
  const readers = useSattalReaders();
  const localize = useLocalizedPath();
  const { lang } = useLanguage();
  const w = useWording();
  const empty = useEmptyState();
  const rows = hands.data ?? [];
  const readerNames = (readers.data ?? []).map((r) => r.name).join(", ");

  return (
    <div>
      <DocumentHead title={w("title.hands")} path="/hands" />
      <PageHero title={w("title.hands")} />
      <section className="w-standard py-12" aria-label={w("title.hands")}>
        {hands.isPending && (
          <p role="status" className="type-small">
            {w("common.loading")}
          </p>
        )}
        {hands.isError && (
          <StatePanel
            title={w("common.load-error")}
            description={toAppError(hands.error).message}
          />
        )}
        {hands.data && rows.length === 0 && <p className="type-body">{empty("hands")}</p>}
        <ul className="flex flex-col gap-4">
          {rows.map((r) => {
            const isReader = r.slug === "outside-reader" && readerNames;
            return (
              <li key={r.id} className="border-border border-t pt-3">
                <Link
                  to={localize(`/hands/${r.slug}`)}
                  className="link-underline font-serif text-xl"
                >
                  {pickLang(r.title as string, r.title_ne, lang)}
                </Link>
                <p className="type-small">
                  {isReader
                    ? w("hands.held-by", { name: readerNames })
                    : r.status === "held"
                      ? w("hands.held-by", { name: r.holder_name })
                      : STATUS_LABEL[r.status ?? ""]
                        ? w(STATUS_LABEL[r.status ?? ""] as WordingKey)
                        : r.status}
                  {r.term_ends_on ? ` · ${w("hands.term-ends", { date: r.term_ends_on })}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export function HandPage() {
  const { slug } = useParams<{ slug: string }>();
  const hands = useHands();
  const localize = useLocalizedPath();
  const { lang } = useLanguage();
  const w = useWording();
  const r = (hands.data ?? []).find((h) => h.slug === slug);

  if (hands.isPending) {
    return (
      <p role="status" className="type-small p-16 text-center">
        {w("common.loading")}
      </p>
    );
  }
  if (!r) return <NotFoundPage />;
  const fields: Array<[string, string | null]> = [
    [w("hands.the-work"), r.work],
    [w("hands.asks"), r.asks],
    [w("hands.gives"), r.gives],
    [w("hands.how-to-say-yes"), r.how_to_say_yes],
  ];
  const title = pickLang(r.title as string, r.title_ne, lang);
  const statusKey = STATUS_LABEL[r.status ?? ""];
  return (
    <article>
      <DocumentHead title={title} path={`/hands/${r.slug}`} />
      <PageHero title={title} {...(statusKey ? { kicker: w(statusKey) } : {})} />
      <div className="w-reading flex flex-col gap-6 py-12">
        {r.status === "held" && (
          <p className="type-body">{w("hands.held-by", { name: r.holder_name })}.</p>
        )}
        {r.status === "dormant" && r.waking_trigger && (
          <p className="type-body">{w("hands.wakes-when", { trigger: r.waking_trigger })}</p>
        )}
        {fields.map(([label, text]) =>
          text ? (
            <section key={label}>
              <h2 className="type-h4">{label}</h2>
              <p className="type-body whitespace-pre-line">{text}</p>
            </section>
          ) : null,
        )}
        <Link to={localize("/hands")} className="link-underline type-small">
          {w("hands.all")}
        </Link>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------
// Encounters: the one calendar the house keeps. Public civic work, dates,
// a place, and a way to turn up. It is structurally separate from anything
// that asks a person to belong: nothing on these pages links onward to the
// Guild, formation, the Commons or Friends, and a workshop sells a day,
// never formation and never a hallmark (Build Programme 11).
// ---------------------------------------------------------------------
const KIND_LABEL: Record<string, WordingKey> = {
  field_study: "encounters.field-study",
  common_ground: "encounters.common-ground",
  chautari: "encounters.chautari",
  workshop: "encounters.workshop",
};

/** Nepali first where the page is addressed to the neighbourhood. */
function bilingual(en: string | null, ne: string | null, leadsNe: boolean | null) {
  if (!ne) return [en].filter(Boolean) as string[];
  return (leadsNe ? [ne, en] : [en, ne]).filter(Boolean) as string[];
}

function EncounterBody({ e }: { e: Encounter }) {
  const eraDate = useEraDate();
  const w = useWording();
  const kindKey = KIND_LABEL[e.kind ?? ""];
  const lead = e.leads_ne ?? false;
  const titles = bilingual(e.title, e.title_ne, lead);
  const places = bilingual(e.place, e.place_ne, lead);
  const how = bilingual(e.how_to_turn_up, e.how_to_turn_up_ne, lead);
  const isNe = (text: string) =>
    text === e.title_ne || text === e.place_ne || text === e.how_to_turn_up_ne;
  return (
    <>
      <p className="type-caption">
        {kindKey ? w(kindKey) : e.kind}
        {" · "}
        {e.starts_on ? eraDate(e.starts_on) : ""}
        {e.ends_on ? ` ${w("encounters.to", { date: eraDate(e.ends_on) })}` : ""}
      </p>
      {titles.map((t) => (
        <p key={t} lang={isNe(t) ? "ne" : "en"} className="font-serif text-2xl">
          {t}
        </p>
      ))}
      {places.map((t) => (
        <p key={t} lang={isNe(t) ? "ne" : "en"} className="type-body">
          {t}
        </p>
      ))}
      {how.map((t) => (
        <p key={t} lang={isNe(t) ? "ne" : "en"} className="type-small">
          {t}
        </p>
      ))}
    </>
  );
}

export function EncountersPage() {
  const cal = useEncountersCalendar();
  const item = usePublishedItem("page", "encounters");
  const localize = useLocalizedPath();
  const { lang } = useLanguage();
  const w = useWording();
  const empty = useEmptyState();
  const body = item.data
    ? (pickLangDoc(item.data.body, item.data.body_ne, lang) as RichTextNode | null)
    : null;
  return (
    <div>
      <DocumentHead title={w("title.encounters")} path="/encounters" />
      <PageHero title={w("title.encounters")} />
      <div className="w-standard flex flex-col gap-10 py-12">
        {body && <RichText doc={body} className="rich-text" />}
        {cal.isPending && (
          <p role="status" className="type-small">
            {w("common.loading")}
          </p>
        )}
        {cal.isError && (
          <StatePanel title={w("common.load-error")} description={toAppError(cal.error).message} />
        )}
        {cal.data && cal.data.length === 0 && <p className="type-body">{empty("encounters")}</p>}
        <ol className="flex flex-col gap-8">
          {(cal.data ?? []).map((e) => (
            <li key={e.id} className="border-border border-t pt-4">
              <EncounterBody e={e} />
              <Link to={localize(`/encounters/${e.slug}`)} className="link-underline type-small">
                {w("common.details")}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function EncounterPage() {
  const { slug } = useParams<{ slug: string }>();
  const enc = useEncounter(slug);
  const w = useWording();
  if (enc.isPending) {
    return (
      <p role="status" className="type-small p-16 text-center">
        {w("common.loading")}
      </p>
    );
  }
  if (!enc.data) return <NotFoundPage />;
  const e = enc.data;
  return (
    <article>
      <DocumentHead title={e.title ?? w("title.encounter")} path={`/encounters/${e.slug}`} />
      <div className="w-reading flex flex-col gap-3 pb-16 pt-32 md:pt-40">
        <EncounterBody e={e} />
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------
// Safeguarding (Build Programme 12). A statement, a named route to raise a
// concern that does not pass through the person a concern might be about,
// and the children photography rule. The words are the house's; the route
// and the rule are read from published pages, and the form below stores a
// concern where only the one named holder of safeguarding.read can read it.
// ---------------------------------------------------------------------
export function SafeguardingPage() {
  const route = usePublishedItem("page", "safeguarding-route");
  const localize = useLocalizedPath();
  const { lang } = useLanguage();
  const [writerName, setWriterName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [body, setBody] = React.useState("");
  const submit = useSubmitConcern();
  const w = useWording();
  const routeDoc = route.data
    ? (pickLangDoc(route.data.body, route.data.body_ne, lang) as RichTextNode | null)
    : null;

  return (
    <ShellPage slug="safeguarding" title={w("title.safeguarding")}>
      <div className="w-reading flex flex-col gap-8 pb-16">
        {routeDoc && <RichText doc={routeDoc} className="rich-text" />}
        <p className="type-body">
          <Link to={localize("/safeguarding/children")} className="link-underline">
            {w("safeguarding.children-link")}
          </Link>
        </p>
        {submit.isSuccess ? (
          <StatePanel title={w("common.received")} description="" />
        ) : (
          <form
            className="flex flex-col gap-4"
            aria-labelledby="concern-h"
            onSubmit={(e) => {
              e.preventDefault();
              if (body.trim()) submit.mutate({ writerName, contact, body });
            }}
          >
            <h2 id="concern-h" className="type-h3">
              {w("safeguarding.raise")}
            </h2>
            <Field label={w("safeguarding.your-name")} htmlFor="concern-name">
              <Input
                id="concern-name"
                value={writerName}
                onChange={(e) => setWriterName(e.target.value)}
              />
            </Field>
            <Field label={w("safeguarding.reach-you")} htmlFor="concern-contact">
              <Input
                id="concern-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </Field>
            <Field label={w("safeguarding.what")} htmlFor="concern-body">
              <Textarea
                id="concern-body"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
            {submit.isError &&
              (isUnavailable(submit.error) ? (
                <FormUnavailable />
              ) : (
                <p role="alert" aria-live="assertive" className="text-destructive text-sm">
                  {toAppError(submit.error).message}
                </p>
              ))}
            <Button
              type="submit"
              loading={submit.isPending}
              disabled={!body.trim()}
              className="self-start"
            >
              {w("common.send")}
            </Button>
          </form>
        )}
      </div>
    </ShellPage>
  );
}

export const ChildrenPhotographyPage = () => {
  const w = useWording();
  return <ShellPage slug="children-photography" title={w("title.children-photography")} />;
};

// ---------------------------------------------------------------------
// The Brief: confirm (a deliberate act, so a mail scanner that opens the
// link cannot subscribe anyone) and unsubscribe (one action, on arrival).
// ---------------------------------------------------------------------
export function BriefConfirmPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const confirm = useBriefToken("confirm");
  const w = useWording();
  return (
    <div>
      <DocumentHead title={w("title.brief")} path="/brief/confirm" noindex />
      <PageHero title={w("title.brief")} />
      <div className="w-reading flex flex-col gap-4 py-12">
        {confirm.isSuccess ? (
          <p role="status" className="type-body">
            {w("brief.confirmed")}
          </p>
        ) : (
          <>
            <Button
              type="button"
              loading={confirm.isPending}
              disabled={!token}
              className="self-start"
              onClick={() => confirm.mutate(token)}
            >
              {w("brief.confirm-button")}
            </Button>
            {confirm.isError &&
              (isUnavailable(confirm.error) ? (
                <FormUnavailable />
              ) : (
                <p role="alert" className="text-destructive text-sm">
                  {toAppError(confirm.error).message}
                </p>
              ))}
          </>
        )}
      </div>
    </div>
  );
}

export function BriefUnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const unsub = useBriefToken("unsubscribe");
  const mutate = unsub.mutate;
  const w = useWording();
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (token && !fired.current) {
      fired.current = true;
      mutate(token);
    }
  }, [token, mutate]);
  return (
    <div>
      <DocumentHead title={w("title.brief")} path="/brief/unsubscribe" noindex />
      <PageHero title={w("title.brief")} />
      <div className="w-reading py-12">
        {unsub.isSuccess && (
          <p role="status" className="type-body">
            {w("brief.unsubscribed")}
          </p>
        )}
        {unsub.isPending && (
          <p role="status" className="type-small">
            {w("brief.unsubscribing")}
          </p>
        )}
        {unsub.isError &&
          (isUnavailable(unsub.error) ? (
            <FormUnavailable />
          ) : (
            <p role="alert">{toAppError(unsub.error).message}</p>
          ))}
        {!token && <p className="type-body">{w("brief.link-incomplete")}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// The Guild's hallmark register (Build Programme 9). A buyer who sees a
// struck row has no way to verify it without a register, so the punch is
// decoration without one. It lists each formed maker, their own mark, the
// year letter and the date registered, and it shows a retired mark: a punch
// that leaves the house's keeping is destroyed, and the destruction is
// recorded.
// ---------------------------------------------------------------------
export function GuildRegister() {
  const register = useGuildRegister();
  const eraDate = useEraDate();
  const localize = useLocalizedPath();
  const { lang } = useLanguage();
  const w = useWording();
  const empty = useEmptyState();
  return (
    <section className="w-standard border-border border-t py-12" aria-labelledby="register-h">
      <h2 id="register-h" className="type-h2">
        {w("guild.register")}
      </h2>
      <p className="type-small mt-2">{w("guild.punch-rule")}</p>
      {register.isPending && (
        <p role="status" className="type-small mt-4">
          {w("common.loading")}
        </p>
      )}
      {register.data && register.data.length === 0 && (
        <p className="type-body mt-4">{empty("guild")}</p>
      )}
      <ul className="mt-6 flex flex-col gap-4">
        {(register.data ?? []).map((m) => (
          <li key={m.id}>
            <Link
              to={localize(`/people/${m.person_slug}`)}
              className="link-underline font-serif text-xl"
            >
              {pickLang(m.person_name as string, m.person_name_ne, lang)}
            </Link>
            <p className="type-small">
              {[
                m.mark_description ? w("guild.mark", { mark: m.mark_description }) : "",
                m.year_letter ? w("guild.year-letter", { letter: m.year_letter }) : "",
                m.registered_on ? w("guild.registered", { date: eraDate(m.registered_on) }) : "",
                m.destroyed_on ? w("guild.destroyed", { date: eraDate(m.destroyed_on) }) : "",
              ]
                .filter(Boolean)
                .join(" ")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------
// The Treasury: the Annual's account, not a live dashboard.
// ---------------------------------------------------------------------
export function TreasuryAccounts() {
  const accounts = useTreasuryAccounts();
  const w = useWording();
  const empty = useEmptyState();
  return (
    <section className="w-standard border-border border-t py-12" aria-labelledby="account-h">
      <h2 id="account-h" className="type-h2">
        {w("treasury.account")}
      </h2>
      {accounts.isPending && (
        <p role="status" className="type-small mt-4">
          {w("common.loading")}
        </p>
      )}
      {accounts.data && accounts.data.length === 0 && (
        <p className="type-body mt-4">{empty("treasury")}</p>
      )}
      <div className="mt-6 flex flex-col gap-10">
        {(accounts.data ?? []).map((a) => (
          <article key={a.id}>
            <h3 className="type-h3">{a.year_span}</h3>
            <dl className="type-body mt-3 flex flex-col gap-2">
              {a.patronage_share_minor != null && (
                <div>
                  {w("treasury.patronage", { amount: formatMoney(a.patronage_share_minor) })}
                  {a.patronage_note ? `. ${a.patronage_note}` : ""}
                </div>
              )}
              {a.tithe_minor != null && (
                <div>
                  {w("treasury.tithe", { amount: formatMoney(a.tithe_minor) })}
                  {a.tithe_base_minor != null
                    ? ` ${w("treasury.tithe-base", { amount: formatMoney(a.tithe_base_minor) })}`
                    : ""}
                  .
                </div>
              )}
              {a.largest_share_pct != null && (
                <div>
                  {w("treasury.largest-share", { pct: a.largest_share_pct })}{" "}
                  {a.concentration_rule_met ? w("treasury.rule-met") : w("treasury.rule-not-met")}
                </div>
              )}
              {a.gifts_note && <div>{a.gifts_note}</div>}
              {a.instruments_note && (
                <div>{w("treasury.instruments", { text: a.instruments_note })}</div>
              )}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Shown beneath the Friends application: what patronage buys and never buys. */
export function FriendsTermsNote() {
  const w = useWording();
  return (
    <p className="w-reading type-small pb-16">
      <TermsLink kind="friends">{w("terms.friends-link")}</TermsLink>
    </p>
  );
}
