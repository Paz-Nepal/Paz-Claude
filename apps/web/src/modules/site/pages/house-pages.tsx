import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Field, Input, RichText, StatePanel, Textarea, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem, usePublishedItems } from "../api/use-site";
import { useChronicle, useGlossary, useRecordEntry, useSubmitVoiceIntake } from "../api/use-wall";
import { pickLang, pickLangDoc, useLanguage, useLocalizedPath } from "../language";
import { DocumentHead } from "../components/document-head";
import { PageHero } from "../components/paz-editorial";
import { FormUnavailable, isUnavailable, useEraDate } from "../components/wall-parts";
import { PaperPage } from "./paper-page";
import { BriefPage } from "./brief-page";
import { DispatchPage } from "./dispatch-page";
import { PigeonPostPage } from "./pigeon-post-page";
import { AnnualPage } from "./annual-page";
import { SattalPiecePage } from "./sattal-pages";
import { NotFoundPage } from "./not-found-page";

/**
 * A page whose words the house supplies. The structure and the address
 * exist; the words come from the published CMS page of the same slug.
 * Until it is published the page says so plainly and nothing is invented
 * in its place (Build Specification 15).
 */
export function ShellPage({
  slug,
  title,
  children,
}: {
  slug: string;
  title: string;
  children?: React.ReactNode;
}) {
  const item = usePublishedItem("page", slug);
  const { lang } = useLanguage();
  const doc = item.data
    ? (pickLangDoc(item.data.body, item.data.body_ne, lang) as RichTextNode | null)
    : null;
  const heading = item.data ? pickLang(item.data.title ?? title, item.data.title_ne, lang) : title;

  return (
    <div>
      <DocumentHead title={heading} path={`/${slug}`} />
      <PageHero title={heading} />
      <div className="w-reading py-12">
        {item.isPending && <p className="type-small">Loading…</p>}
        {item.isError && (
          <StatePanel title="Couldn't load this." description={toAppError(item.error).message} />
        )}
        {item.isSuccess &&
          (doc ? (
            <RichText doc={doc} className="rich-text" />
          ) : (
            <p className="type-body">This page has not been written yet.</p>
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
  return (
    <div>
      <DocumentHead title="The Chronicle" path="/chronicle" feedPath="/chronicle/feed.xml" />
      <PageHero title="The Chronicle" />
      <section className="w-reading py-12" aria-label="The run">
        {lines.isPending && <p className="type-small">Loading…</p>}
        {lines.isError && (
          <StatePanel title="Couldn't load this." description={toAppError(lines.error).message} />
        )}
        {lines.data && lines.data.length === 0 && (
          <p className="type-body">Nothing is recorded yet.</p>
        )}
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
  return (
    <div>
      <DocumentHead title="Words" path="/words" />
      <PageHero title="Words" />
      <section className="w-reading py-12" aria-label="Glossary">
        {terms.isPending && <p className="type-small">Loading…</p>}
        {terms.data && terms.data.length === 0 && (
          <p className="type-body">No words are listed yet.</p>
        )}
        <dl className="flex flex-col gap-6">
          {(terms.data ?? []).map((t) => (
            <div key={t.id} id={t.slug ?? undefined}>
              <dt className="font-semibold">
                {pickLang(t.term as string, t.term_ne, lang)}
                {t.kind === "spelling" && (
                  <span className="type-small font-normal"> · spelling</span>
                )}
              </dt>
              <dd className="type-body">
                {pickLang(t.definition as string, t.definition_ne, lang)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------
// The deposit number is the canonical address of a deposited work.
// ---------------------------------------------------------------------
export function DepositPage({ deposit }: { deposit: string }) {
  const entry = useRecordEntry(deposit);
  if (entry.isPending) return <p className="type-small p-16 text-center">Loading…</p>;
  if (entry.isError) {
    return (
      <div className="p-16">
        <StatePanel title="Couldn't load this." description={toAppError(entry.error).message} />
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
    default:
      return <NotFoundPage />;
  }
}

// ---------------------------------------------------------------------
// The Commons and Friends of PAZ must read as different in kind. The
// covenanted ladder is described, never offered: there is no signup here.
// ---------------------------------------------------------------------
const LADDER = ["Guest", "Companion", "Denizen", "Steward", "Elder", "Ancestor"];

export function CommonsPage() {
  return (
    <ShellPage slug="commons" title="The Commons">
      <section className="w-reading border-border border-t py-10" aria-labelledby="ladder">
        <h2 id="ladder" className="type-h3">
          The ladder
        </h2>
        <ol className="type-body mt-4 flex flex-col gap-1">
          {LADDER.map((rung) => (
            <li key={rung}>{rung}</li>
          ))}
        </ol>
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
  const docs = (pages.data ?? [])
    .filter((p) => p.slug?.startsWith("canon-"))
    .sort((a, b) => (a.slug as string).localeCompare(b.slug as string));
  return (
    <div>
      <DocumentHead title="The Canon" path="/canon" />
      <PageHero title="The Canon" />
      <section className="w-reading py-12" aria-label="Documents">
        {pages.isPending && <p className="type-small">Loading…</p>}
        {pages.isSuccess && docs.length === 0 && (
          <p className="type-body">No document has been published yet.</p>
        )}
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
  return <ShellPage slug={`canon-${doc}`} title="The Canon" />;
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
  const { lang } = useLanguage();
  const [writerName, setWriterName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [aboutName, setAboutName] = React.useState("");
  const [place, setPlace] = React.useState("");
  const [note, setNote] = React.useState("");
  const submit = useSubmitVoiceIntake();
  const doc = item.data
    ? (pickLangDoc(item.data.body, item.data.body_ne, lang) as RichTextNode | null)
    : null;
  const canSubmit = writerName.trim() && contact.trim();

  return (
    <div>
      <DocumentHead title="A voice" path="/a-voice" noindex />
      <PageHero title="A voice" />
      <div className="w-reading flex flex-col gap-8 py-12">
        {doc && <RichText doc={doc} className="rich-text" />}
        {submit.isSuccess ? (
          <StatePanel title="Received." description="" />
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) submit.mutate({ writerName, contact, aboutName, place, note });
            }}
          >
            <Field label="Your name" htmlFor="voice-writer">
              <Input
                id="voice-writer"
                value={writerName}
                onChange={(e) => setWriterName(e.target.value)}
              />
            </Field>
            <Field label="How to reach you" htmlFor="voice-contact">
              <Input
                id="voice-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </Field>
            <Field label="Name of the person" htmlFor="voice-about">
              <Input
                id="voice-about"
                value={aboutName}
                onChange={(e) => setAboutName(e.target.value)}
              />
            </Field>
            <Field label="Place" htmlFor="voice-place">
              <Input id="voice-place" value={place} onChange={(e) => setPlace(e.target.value)} />
            </Field>
            <Field label="Anything else" htmlFor="voice-note">
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
              Send
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

export const NamePage = () => <ShellPage slug="name" title="The name" />;
export const TablePage = () => <ShellPage slug="table" title="The Table" />;
export const EncountersPage = () => <ShellPage slug="encounters" title="Encounters" />;
export const LookingForPage = () => <ShellPage slug="looking-for" title="Looking for" />;
export const PrivacyPage = () => <ShellPage slug="privacy" title="Privacy" />;
export const TermsPage = () => <ShellPage slug="terms" title="Terms" />;
