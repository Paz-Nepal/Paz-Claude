import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Field, Input, RichText, StatePanel, Textarea, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatDimensions, formatMoney } from "@paz/utils";
import { usePublishedItem } from "../api/use-site";
import { useHouseRooms } from "../api/use-place";
import {
  useSattalPieces,
  useShowWorkLinks,
  useShows,
  useSubmitEnquiry,
  useWork,
  useWorkEvents,
  useWorkImages,
  useWorkTexts,
} from "../api/use-wall";
import { pickLang, pickLangDoc, useLanguage, useLocalizedPath } from "../language";
import { DocumentHead } from "../components/document-head";
import { NotPublished } from "../components/published-body";
import { Mark } from "../components/mark";
import { TermsLink } from "./more-pages";
import { useWording, type WordingKey } from "../wording";
import {
  FormUnavailable,
  PersonLink,
  WorkPicture,
  isUnavailable,
  useEraDate,
} from "../components/wall-parts";

const AVAILABILITY: Record<string, WordingKey> = {
  available: "work.available",
  sold: "work.sold",
  not_for_sale: "work.not-for-sale",
  on_loan: "work.on-loan",
};

const EVENT_LABEL: Record<string, WordingKey> = {
  made: "work.event-made",
  shown: "work.event-shown",
  sold: "work.event-sold",
  loaned: "work.event-loaned",
  returned: "work.event-returned",
  damaged: "work.event-damaged",
  restored: "work.event-restored",
  rehoused: "work.event-rehoused",
};

function labelFrom(
  t: (k: WordingKey) => string,
  table: Record<string, WordingKey>,
  value: string | null | undefined,
): string {
  const k = table[value ?? ""];
  return k ? t(k) : (value ?? "");
}

/**
 * A work's page. The price appears once, plainly, with the Friends price
 * as a second price and never as a saving. Availability is stated
 * honestly, sold included, and a sold work keeps its page forever. No
 * enquire-for-price, no counters, no urgency, no related items (Build
 * Specification 6.3).
 */
export function WorkPage() {
  const { slug } = useParams<{ slug: string }>();
  const work = useWork(slug);
  const w = work.data;
  const images = useWorkImages(w?.id ? [w.id] : []);
  const events = useWorkEvents(w?.id ?? undefined);
  const texts = useWorkTexts(w?.id ?? undefined);
  const shows = useShows();
  const links = useShowWorkLinks();
  const pieces = useSattalPieces();
  const struckRow = usePublishedItem("page", w?.hallmarked ? "struck-row" : undefined);
  const rooms = useHouseRooms();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const eraDate = useEraDate();
  const t = useWording();

  if (work.isPending)
    return (
      <p role="status" className="type-small p-16 text-center">
        {t("common.loading")}
      </p>
    );
  if (work.isError) {
    return (
      <div className="p-16">
        <StatePanel title={t("common.load-error")} description={toAppError(work.error).message} />
      </div>
    );
  }
  if (!w) return <NotPublished />;

  const title = pickLang(w.title as string, w.title_ne, lang);
  const frames = (images.data ?? []).filter((i) => i.work_id === w.id);
  const hangingIn = w.room_id ? (rooms.data ?? []).find((r) => r.id === w.room_id) : undefined;
  const dimensions = formatDimensions(w.height_mm, w.width_mm, w.depth_mm);
  const showIds = new Set(
    (links.data ?? []).filter((l) => l.work_id === w.id).map((l) => l.show_id),
  );
  const hung = (shows.data ?? []).filter((s) => showIds.has(s.id));
  const writtenAbout = (pieces.data ?? []).filter((x) => x.subject_work_id === w.id);
  const struckBody = struckRow.data
    ? (pickLangDoc(struckRow.data.body, struckRow.data.body_ne, lang) as RichTextNode | null)
    : null;

  return (
    <article className="w-wide pt-32 md:pt-40">
      <DocumentHead title={`${title}, ${w.person_name}`} path={`/works/${w.slug}`} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8">
          {frames.map((f, i) => (
            <WorkPicture
              key={f.id}
              image={f}
              eager={i === 0}
              fullSizeLink
              sizes="(min-width: 1024px) 58vw, 92vw"
            />
          ))}
          {frames.length === 0 && <p className="type-small">{t("work.no-photograph")}</p>}
        </div>

        <div className="flex flex-col gap-6">
          <header>
            <p className="type-body">
              <PersonLink
                slug={w.person_slug as string}
                name={pickLang(w.person_name as string, w.person_name_ne, lang)}
              />
            </p>
            <h1 className="type-h1 mt-2">{title}</h1>
          </header>

          <dl className="type-body flex flex-col gap-1">
            {w.year != null && <div>{w.year}</div>}
            {w.medium && <div>{pickLang(w.medium, w.medium_ne, lang)}</div>}
            {dimensions && <div>{dimensions}</div>}
            <div className="type-small">{t("work.number", { number: w.work_number })}</div>
            {hangingIn && hangingIn.slug && (
              <div className="type-small">
                <Link to={localize(`/house/rooms/${hangingIn.slug}`)} className="link-underline">
                  {t("place.in-room", {
                    room: pickLang(hangingIn.name as string, hangingIn.name_ne, lang),
                  })}
                </Link>
              </div>
            )}
          </dl>

          <div className="type-body flex flex-col gap-1">
            {w.price_minor != null && <p>{formatMoney(w.price_minor, w.currency ?? "NPR")}</p>}
            {w.friends_price_minor != null && (
              <p className="type-small">
                {t("work.friends-price", {
                  price: formatMoney(w.friends_price_minor, w.currency ?? "NPR"),
                })}
              </p>
            )}
            <p className="font-semibold">{labelFrom(t, AVAILABILITY, w.availability)}</p>
          </div>

          {w.hallmarked && (
            <section aria-label={t("work.struck-row")} data-slot="struck-row-line">
              {/* The gallery's one line explaining the struck row is blocked:
                  the house supplies it as the published page "struck-row".
                  Nothing is written here in its place. */}
              <Mark />
              {struckBody && <RichText doc={struckBody} className="rich-text type-small" />}
            </section>
          )}

          {w.provenance_note && <p className="type-small">{w.provenance_note}</p>}

          {(texts.data ?? []).length > 0 && (
            <section aria-labelledby="work-text" className="flex flex-col gap-4">
              <h2 id="work-text" className="sr-only">
                {t("work.text-heading")}
              </h2>
              {(texts.data ?? []).map((tx) => (
                <div key={tx.id}>
                  <p className="type-caption">
                    {tx.attribution === "maker" ? t("work.makers-words") : t("work.house-writes")}
                  </p>
                  <p className="type-body whitespace-pre-line">
                    {pickLang(tx.body as string, tx.body_ne, lang)}
                  </p>
                </div>
              ))}
            </section>
          )}

          <Enquiry workId={w.id as string} />
        </div>
      </div>

      <section className="border-border mt-16 border-t py-10" aria-labelledby="life">
        <h2 id="life" className="type-h2">
          {t("work.its-life")}
        </h2>
        {(events.data ?? []).length === 0 ? (
          <p className="type-body mt-4">{t("work.life-empty")}</p>
        ) : (
          <ol className="mt-6 flex flex-col gap-2">
            {(events.data ?? []).map((e) => (
              <li key={e.id} className="type-body">
                <span className="type-small">{e.occurred_on ? eraDate(e.occurred_on) : ""}</span>{" "}
                {labelFrom(t, EVENT_LABEL, e.kind)}
                {e.note ? `. ${e.note}` : ""}
              </li>
            ))}
          </ol>
        )}
      </section>

      {hung.length > 0 && (
        <section className="border-border border-t py-10" aria-labelledby="hung">
          <h2 id="hung" className="type-h2">
            {t("work.where-hung")}
          </h2>
          <ul className="mt-6 flex flex-col gap-2">
            {hung.map((s) => (
              <li key={s.id}>
                <Link to={localize(`/shows/${s.slug}`)} className="link-underline">
                  {pickLang(s.title as string, s.title_ne, lang)}
                </Link>
                <span className="type-small">
                  {" · "}
                  {s.opened_on ? eraDate(s.opened_on) : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {writtenAbout.length > 0 && (
        <section className="border-border border-t py-10 pb-24" aria-labelledby="written">
          <h2 id="written" className="type-h2">
            {t("work.written-about")}
          </h2>
          <ul className="mt-6 flex flex-col gap-2">
            {writtenAbout.map((x) => (
              <li key={x.id}>
                <Link to={localize(`/sattal/${x.slug}`)} className="link-underline">
                  {pickLang(x.title as string, x.title_ne, lang)}
                </Link>
                <span className="type-small">
                  {" "}
                  · {t("work.by-sattal", { name: x.person_name })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

/**
 * A sale is a conversation: condition, framing, whether a canvas travels
 * rolled or stretched, shipping, customs. There is no checkout to pretend
 * to. An enquiry opens a conversation a person answers (Build
 * Specification 12).
 */
function Enquiry({ workId }: { workId: string }) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const submit = useSubmitEnquiry();
  const t = useWording();
  const canSubmit = fullName.trim() && email.trim() && message.trim();

  if (submit.isSuccess) {
    return <StatePanel title={t("work.enquiry-sent")} description={t("work.enquiry-sent-note")} />;
  }

  return (
    <form
      className="flex flex-col gap-4"
      aria-labelledby="enquiry-h"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) submit.mutate({ fullName, email, message, workId });
      }}
    >
      <h2 id="enquiry-h" className="type-h3">
        {t("work.enquiry-heading")}
      </h2>
      <p className="type-small">
        <TermsLink kind="painters">{t("work.painters-terms")}</TermsLink>.
      </p>
      <p className="type-small">{t("work.enquiry-intro")}</p>
      <Field label={t("work.name")} htmlFor="enq-name">
        <Input id="enq-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </Field>
      <Field label={t("work.email")} htmlFor="enq-email">
        <Input
          id="enq-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label={t("work.message")} htmlFor="enq-message">
        <Textarea
          id="enq-message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
      <Button type="submit" loading={submit.isPending} disabled={!canSubmit} className="self-start">
        {t("common.send")}
      </Button>
    </form>
  );
}
