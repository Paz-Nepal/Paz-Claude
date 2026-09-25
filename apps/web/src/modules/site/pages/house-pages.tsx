import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Field, Input, RichText, StatePanel, Textarea, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem, usePublishedItems } from "../api/use-site";
import {
  useChronicle,
  useGlossary,
  useRecordEntry,
  useSubmitVoiceIntake,
  type GlossaryTerm,
} from "../api/use-wall";
import { pickLang, pickLangDoc, useLanguage, useLocalizedPath } from "../language";
import { useEmptyState } from "../empty-states";
import { useWording, type WordingKey } from "../wording";
import { DocumentHead } from "../components/document-head";
import { PageHero } from "../components/paz-editorial";
import { OfferForm } from "../components/offer-form";
import { FormUnavailable, isUnavailable, useEraDate } from "../components/wall-parts";
import { PaperPage } from "./paper-page";
import { BriefPage } from "./brief-page";
import { DispatchPage } from "./dispatch-page";
import { PigeonPostPage } from "./pigeon-post-page";
import { AnnualPage } from "./annual-page";
import { SattalPiecePage } from "./sattal-pages";
import { NotFoundPage } from "./not-found-page";
import { TermsDocPage, TermsLink } from "./more-pages";

/**
 * A page whose words the house supplies. The structure and the address
 * exist; the words come from the published CMS page of the same slug.
 * Until it is published the page says so plainly and nothing is invented
 * in its place (Build Specification 15).
 */
export function ShellPage({
  slug,
  title,
  path,
  children,
}: {
  slug: string;
  title: string;
  /** The public address, where it is not simply /<slug>. */
  path?: string;
  children?: React.ReactNode;
}) {
  const item = usePublishedItem("page", slug);
  const { lang } = useLanguage();
  const w = useWording();
  const doc = item.data
    ? (pickLangDoc(item.data.body, item.data.body_ne, lang) as RichTextNode | null)
    : null;
  const heading = item.data ? pickLang(item.data.title ?? title, item.data.title_ne, lang) : title;

  return (
    <div>
      <DocumentHead title={heading} path={path ?? `/${slug}`} />
      <PageHero title={heading} />
      <div className="w-reading py-12">
        {item.isPending && (
          <p role="status" className="type-small">
            {w("common.loading")}
          </p>
        )}
        {item.isError && (
          <StatePanel title={w("common.load-error")} description={toAppError(item.error).message} />
        )}
        {item.isSuccess &&
          (doc ? (
            <RichText doc={doc} className="rich-text" />
          ) : (
            <p className="type-body">{w("common.not-written")}</p>
          ))}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------
// The Chronicle: a run, not articles. One continuous column, dated lines,
// newest first. No titles, no bodies, no per-entry pages, no slugs. It
// records the house's acts, never the people they were done to.
// ---------------------------------------------------------------------
export function ChroniclePage() {
  const lines = useChronicle();
  const eraDate = useEraDate();
  const w = useWording();
  const empty = useEmptyState();
  return (
    <div>
      <DocumentHead title={w("title.chronicle")} path="/chronicle" feedPath="/chronicle/feed.xml" />
      <PageHero title={w("title.chronicle")} />
      <section className="w-reading py-12" aria-label={w("title.chronicle")}>
        {lines.isPending && (
          <p role="status" className="type-small">
            {w("common.loading")}
          </p>
        )}
        {lines.isError && (
          <StatePanel
            title={w("common.load-error")}
            description={toAppError(lines.error).message}
          />
        )}
        {lines.data && lines.data.length === 0 && <p className="type-body">{empty("chronicle")}</p>}
        <ol className="flex flex-col gap-3">
          {(lines.data ?? []).map((l) => (
            <li key={l.id} className="type-body">
              <span className="type-small">{l.line_on ? eraDate(l.line_on) : ""}</span> {l.line}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------
// /words: the glossary and the spelling list's public face
// ---------------------------------------------------------------------
export function WordsPage() {
  const terms = useGlossary();
  const { lang } = useLanguage();
  const w = useWording();
  return (
    <div>
      <DocumentHead title={w("title.words")} path="/words" />
      <PageHero title={w("title.words")} />
      <section className="w-reading py-12" aria-label={w("title.words")}>
        {terms.isPending && (
          <p role="status" className="type-small">
            {w("common.loading")}
          </p>
        )}
        {terms.data && terms.data.length === 0 && <p className="type-body">{w("empty.words")}</p>}
        <dl className="flex flex-col gap-6">
          {(terms.data ?? [])
            .filter((t) => t.kind !== "sought")
            .map((t) => (
              <div key={t.id} id={t.slug ?? undefined}>
                <dt className="font-semibold">
                  {pickLang(t.term as string, t.term_ne, lang)}
                  {t.kind === "spelling" && (
                    <span className="type-small font-normal"> · {w("words.spelling")}</span>
                  )}
                </dt>
                <dd className="type-body">
                  {pickLang(t.definition as string, t.definition_ne, lang)}
                </dd>
              </div>
            ))}
        </dl>
      </section>
      <SoughtWords terms={terms.data ?? []} />
    </div>
  );
}

/**
 * Words the house has met and cannot yet explain, with a way to write in.
 * No word is linked to a giver or to any deposit: the table has no such
 * column, and an offer of a word is kept apart from the word itself.
 */
function SoughtWords({ terms }: { terms: GlossaryTerm[] }) {
  const { lang } = useLanguage();
  const w = useWording();
  const sought = terms.filter((t) => t.kind === "sought");
  return (
    <section className="w-reading border-border border-t py-12" aria-labelledby="sought-words">
      <h2 id="sought-words" className="type-h3">
        {w("words.sought-heading")}
      </h2>
      <p className="type-body mb-6 mt-3">{w("words.sought-intro")}</p>
      {sought.length === 0 ? (
        <p className="type-body mb-6">{w("empty.sought")}</p>
      ) : (
        <ul className="type-body mb-8 flex flex-col gap-1">
          {sought.map((t) => (
            <li key={t.id} id={t.slug ?? undefined}>
              {pickLang(t.term as string, t.term_ne, lang)}
            </li>
          ))}
        </ul>
      )}
      <OfferForm
        kind="word"
        idPrefix="offer-word"
        asks={[
          { key: "subject", label: "words.offer-word", required: true },
          { key: "note", label: "words.offer-note", type: "textarea" },
        ]}
      />
    </section>
  );
}

// ---------------------------------------------------------------------
// The deposit number is the canonical address of a deposited work.
// ---------------------------------------------------------------------
export function DepositPage({ deposit }: { deposit: string }) {
  const entry = useRecordEntry(deposit);
  const w = useWording();
  if (entry.isPending)
    return (
      <p role="status" className="type-small p-16 text-center">
        {w("common.loading")}
      </p>
    );
  if (entry.isError) {
    return (
      <div className="p-16">
        <StatePanel title={w("common.load-error")} description={toAppError(entry.error).message} />
      </div>
    );
  }
  const e = entry.data;
  if (!e || !e.readable_path) return <NotFoundPage />;
  const slug = e.readable_path.split("/").pop() ?? "";
  switch (e.entry_type) {
    case "paper":
      return <PaperPage slug={slug} />;
    case "brief":
      return <BriefPage slug={slug} />;
    case "dispatch":
      return <DispatchPage slug={slug} />;
    case "pigeon_post":
      return <PigeonPostPage slug={slug} />;
    case "annual":
      return <AnnualPage slug={slug} />;
    case "sattal":
      return <SattalPiecePage slug={slug} />;
    case "terms":
      return <TermsDocPage slug={slug} canonical />;
    default:
      return <NotFoundPage />;
  }
}

// ---------------------------------------------------------------------
// The Commons and Friends of PAZ must read as different in kind. The
// covenanted ladder is described, never offered: there is no signup here.
// ---------------------------------------------------------------------
const LADDER: WordingKey[] = [
  "commons.rung-guest",
  "commons.rung-companion",
  "commons.rung-denizen",
  "commons.rung-steward",
  "commons.rung-elder",
  "commons.rung-ancestor",
];

export function CommonsPage() {
  const w = useWording();
  const empty = useEmptyState();
  return (
    <ShellPage slug="commons" title={w("title.commons")}>
      <section className="w-reading border-border border-t py-10" aria-labelledby="ladder">
        <h2 id="ladder" className="type-h3">
          {w("commons.ladder")}
        </h2>
        <ol className="type-body mt-4 flex flex-col gap-1">
          {LADDER.map((rung) => (
            <li key={rung}>{w(rung)}</li>
          ))}
        </ol>
        <p className="type-body mt-4">{empty("commons")}</p>
      </section>
    </ShellPage>
  );
}

// ---------------------------------------------------------------------
// The canon: seven documents, each deposited and numbered. The text is
// blocked; the structure is here, fed by published pages slugged
// canon-<n>, so the house's words arrive without a code change.
// ---------------------------------------------------------------------
export function CanonIndexPage() {
  const pages = usePublishedItems("page");
  const localize = useLocalizedPath();
  const { lang } = useLanguage();
  const w = useWording();
  const docs = (pages.data ?? [])
    .filter((p) => p.slug?.startsWith("canon-"))
    .sort((a, b) => (a.slug as string).localeCompare(b.slug as string));
  return (
    <div>
      <DocumentHead title={w("title.canon")} path="/canon" />
      <PageHero title={w("title.canon")} />
      <section className="w-reading py-12" aria-label={w("title.canon")}>
        {pages.isPending && (
          <p role="status" className="type-small">
            {w("common.loading")}
          </p>
        )}
        {pages.isSuccess && docs.length === 0 && <p className="type-body">{w("empty.canon")}</p>}
        <ol className="flex flex-col gap-3">
          {docs.map((d) => (
            <li key={d.id}>
              <Link
                to={localize(`/canon/${(d.slug as string).replace(/^canon-/, "")}`)}
                className="link-underline font-serif text-xl"
              >
                {pickLang(d.title as string, d.title_ne, lang)}
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export function CanonDocPage({ doc }: { doc: string }) {
  const w = useWording();
  return <ShellPage slug={`canon-${doc}`} title={w("title.canon")} />;
}

// ---------------------------------------------------------------------
// /a-voice: a private intake. It must not imply that a recording will
// follow. Nothing here is published, listed, indexed or searchable, and
// only authenticated staff can read what is sent. The words above the
// form are the house's (blocked); the page shows the published page
// "a-voice" if there is one, and otherwise only the form.
// ---------------------------------------------------------------------
export function AVoicePage() {
  const item = usePublishedItem("page", "a-voice");
  const statement = usePublishedItem("page", "a-voice-statement");
  const { lang } = useLanguage();
  const [offering, setOffering] = React.useState("voice");
  const [writerName, setWriterName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [aboutName, setAboutName] = React.useState("");
  const [place, setPlace] = React.useState("");
  const [note, setNote] = React.useState("");
  const submit = useSubmitVoiceIntake();
  const w = useWording();
  const doc = item.data
    ? (pickLangDoc(item.data.body, item.data.body_ne, lang) as RichTextNode | null)
    : null;
  const statementDoc = statement.data
    ? (pickLangDoc(statement.data.body, statement.data.body_ne, lang) as RichTextNode | null)
    : null;
  const canSubmit = writerName.trim() && contact.trim();

  return (
    <div>
      <DocumentHead title={w("title.a-voice")} path="/a-voice" noindex />
      <PageHero title={w("title.a-voice")} />
      <div className="w-reading flex flex-col gap-8 py-12">
        {doc && <RichText doc={doc} className="rich-text" />}
        {/* Its own statement, separate from the privacy page: who reads it, that
            nothing is published, that the house is not recording yet, and what
            happens to what is written. The words are the house's. */}
        {statementDoc && <RichText doc={statementDoc} className="rich-text" />}
        <p className="type-small">
          <TermsLink kind="memory">{w("voice.memory-link")}</TermsLink>
        </p>
        {submit.isSuccess ? (
          <StatePanel title={w("common.received")} description="" />
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit)
                submit.mutate({ writerName, contact, aboutName, place, note, kind: offering });
            }}
          >
            <Field label={w("voice.offering")} htmlFor="voice-offering">
              <select
                id="voice-offering"
                className="border-input bg-background text-foreground h-10 w-full rounded-lg border px-3 py-2 text-base"
                value={offering}
                onChange={(e) => setOffering(e.target.value)}
              >
                <option value="voice">{w("voice.offer-voice")}</option>
                <option value="photographs">{w("voice.offer-photographs")}</option>
                <option value="papers">{w("voice.offer-papers")}</option>
                <option value="the_present">{w("voice.offer-present")}</option>
                <option value="other">{w("voice.offer-other")}</option>
              </select>
            </Field>
            <Field label={w("voice.your-name")} htmlFor="voice-writer">
              <Input
                id="voice-writer"
                value={writerName}
                onChange={(e) => setWriterName(e.target.value)}
              />
            </Field>
            <Field label={w("voice.reach-you")} htmlFor="voice-contact">
              <Input
                id="voice-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </Field>
            <Field label={w("voice.person")} htmlFor="voice-about">
              <Input
                id="voice-about"
                value={aboutName}
                onChange={(e) => setAboutName(e.target.value)}
              />
            </Field>
            <Field label={w("voice.place")} htmlFor="voice-place">
              <Input id="voice-place" value={place} onChange={(e) => setPlace(e.target.value)} />
            </Field>
            <Field label={w("voice.else")} htmlFor="voice-note">
              <Textarea
                id="voice-note"
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
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
              disabled={!canSubmit}
              className="self-start"
            >
              {w("common.send")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

// Route adapters: the page components take plain props so the deposit
// resolver can render them; the router hands them URL parameters here.
export function DepositRoute() {
  const { deposit } = useParams<{ deposit: string }>();
  return <DepositPage deposit={deposit ?? ""} />;
}

export function CanonDocRoute() {
  const { doc } = useParams<{ doc: string }>();
  return <CanonDocPage doc={doc ?? ""} />;
}

/** A page whose title is one line of the site's wording. */
function TitledShell({ slug, title }: { slug: string; title: WordingKey }) {
  const w = useWording();
  return <ShellPage slug={slug} title={w(title)} />;
}

export const NamePage = () => <TitledShell slug="name" title="title.name" />;
export const TablePage = () => <TitledShell slug="table" title="title.table" />;
export const LookingForPage = () => <TitledShell slug="looking-for" title="title.looking-for" />;
export function PrivacyPage() {
  const w = useWording();
  const localize = useLocalizedPath();
  return (
    <ShellPage slug="privacy" title={w("title.privacy")}>
      <p className="type-body w-reading pb-12">
        <Link to={localize("/leaving")} className="link-underline">
          {w("privacy.leaving")}
        </Link>
      </p>
    </ShellPage>
  );
}
export const CustodianPage = () => <TitledShell slug="custodian" title="title.custodian" />;
