import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Field, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatDimensions } from "@paz/utils";
import { useVerifyHallmark, useVerifyWork } from "../api/use-place";
import { pickLang, useLanguage, useLocalizedPath } from "../language";
import { useWording, type WordingKey } from "../wording";
import { DocumentHead } from "../components/document-head";
import { PageHero } from "../components/paz-editorial";
import { PersonLink, useEraDate } from "../components/wall-parts";

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

interface LifeEvent {
  occurred_on: string;
  kind: string;
  note: string | null;
}

/** Check a certificate: type the number printed on it. */
export function VerifyPage() {
  const w = useWording();
  const navigate = useNavigate();
  const localize = useLocalizedPath();
  const [value, setValue] = React.useState("");
  const number = Number(value.trim().replace(/^no\.?\s*/i, ""));
  const valid = Number.isInteger(number) && number > 0;

  return (
    <div>
      <DocumentHead title={w("title.verify")} path="/verify" />
      <PageHero title={w("title.verify")} subtitle={w("verify.intro")} />
      <div className="w-reading py-12">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) navigate(localize(`/verify/work/${number}`));
          }}
        >
          <Field
            label={w("verify.work-number")}
            htmlFor="verify-number"
            hint={w("verify.work-number-hint")}
          >
            <Input
              id="verify-number"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={!valid} className="self-start">
            {w("verify.check")}
          </Button>
        </form>
        <p className="type-small mt-8">{w("verify.never")}</p>
      </div>
    </div>
  );
}

export function VerifyWorkPage() {
  const { number } = useParams<{ number: string }>();
  const n = Number(number);
  const result = useVerifyWork(Number.isInteger(n) && n > 0 ? n : null);
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const eraDate = useEraDate();
  const w = useWording();
  const r = result.data;
  const events = ((r?.events ?? []) as unknown as LifeEvent[]).filter((e) => e && e.kind);

  return (
    <div>
      <DocumentHead title={w("title.verify")} path={`/verify/work/${number ?? ""}`} noindex />
      <PageHero title={w("verify.result-title", { number: number ?? "" })} />
      <div className="w-reading flex flex-col gap-8 py-12">
        {result.isPending && (
          <p role="status" className="type-small">
            {w("common.loading")}
          </p>
        )}
        {result.isError && (
          <StatePanel
            title={w("common.load-error")}
            description={toAppError(result.error).message}
          />
        )}
        {result.isSuccess && !r && <p className="type-body">{w("verify.not-found")}</p>}
        {r && (
          <>
            <dl className="type-body flex flex-col gap-2">
              <div>
                <dt className="font-semibold">{w("verify.maker")}</dt>
                <dd>
                  <PersonLink
                    slug={r.person_slug}
                    name={pickLang(r.person_name, r.person_name_ne, lang)}
                  />
                </dd>
              </div>
              <div>
                <dt className="font-semibold">{w("verify.title")}</dt>
                <dd>
                  <Link to={localize(`/works/${r.slug}`)} className="link-underline">
                    {pickLang(r.title, r.title_ne, lang)}
                  </Link>
                </dd>
              </div>
              {r.year != null && (
                <div>
                  <dt className="font-semibold">{w("verify.year")}</dt>
                  <dd>{r.year}</dd>
                </div>
              )}
              {r.medium && (
                <div>
                  <dt className="font-semibold">{w("verify.medium")}</dt>
                  <dd>{pickLang(r.medium, r.medium_ne, lang)}</dd>
                </div>
              )}
              {formatDimensions(r.height_mm, r.width_mm, r.depth_mm) && (
                <div>
                  <dt className="font-semibold">{w("verify.size")}</dt>
                  <dd>{formatDimensions(r.height_mm, r.width_mm, r.depth_mm)}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold">{w("verify.hallmark")}</dt>
                <dd>
                  {r.hallmarked
                    ? [
                        r.mark_description,
                        r.year_letter ? w("verify.year-letter", { letter: r.year_letter }) : null,
                      ]
                        .filter(Boolean)
                        .join(". ") || w("verify.hallmarked")
                    : w("verify.not-hallmarked")}
                </dd>
              </div>
            </dl>
            {events.length > 0 && (
              <section aria-labelledby="verify-life">
                <h2 id="verify-life" className="type-h3">
                  {w("verify.life")}
                </h2>
                <ol className="type-body mt-3 flex flex-col gap-2">
                  {events.map((e, i) => (
                    <li key={`${e.occurred_on}-${i}`}>
                      <span className="type-small">{eraDate(e.occurred_on)}</span>{" "}
                      {EVENT_LABEL[e.kind] ? w(EVENT_LABEL[e.kind] as WordingKey) : e.kind}
                      {e.note ? `: ${e.note}` : ""}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}
        <p className="type-small">{w("verify.never")}</p>
      </div>
    </div>
  );
}

/** Check a hallmark: a maker's mark, year letter or name against the Guild's register. */
export function HallmarkCheck() {
  const w = useWording();
  const { lang } = useLanguage();
  const eraDate = useEraDate();
  const [draft, setDraft] = React.useState("");
  const [asked, setAsked] = React.useState("");
  const result = useVerifyHallmark(asked);

  return (
    <section className="w-standard border-border border-t py-12" aria-labelledby="hallmark-check">
      <h2 id="hallmark-check" className="type-h3">
        {w("verify.hallmark-check")}
      </h2>
      <p className="type-body mb-4 mt-3">{w("verify.hallmark-intro")}</p>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setAsked(draft.trim());
        }}
      >
        <Field label={w("verify.hallmark-field")} htmlFor="hallmark-query" className="flex-1">
          <Input id="hallmark-query" value={draft} onChange={(e) => setDraft(e.target.value)} />
        </Field>
        <Button type="submit" disabled={!draft.trim()}>
          {w("verify.check")}
        </Button>
      </form>
      {result.isError && (
        <StatePanel title={w("common.load-error")} description={toAppError(result.error).message} />
      )}
      {asked && result.isSuccess && (result.data ?? []).length === 0 && (
        <p className="type-body mt-4">{w("verify.hallmark-none")}</p>
      )}
      <ul className="type-body mt-4 flex flex-col gap-3">
        {(result.data ?? []).map((m, i) => (
          <li key={`${m.person_slug}-${i}`}>
            <PersonLink
              slug={m.person_slug}
              name={pickLang(m.person_name, m.person_name_ne, lang)}
            />
            <br />
            {[
              m.mark_description,
              m.year_letter ? w("verify.year-letter", { letter: m.year_letter }) : null,
            ]
              .filter(Boolean)
              .join(". ")}
            <br />
            <span className="type-small">
              {m.punch_status === "destroyed"
                ? w("verify.punch-destroyed", {
                    date: m.destroyed_on ? eraDate(m.destroyed_on) : "",
                  })
                : w("verify.punch-in-use")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
