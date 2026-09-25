import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Field, Input, StatePanel, Textarea } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatMoney } from "@paz/utils";
import { useSubmitEnquiry } from "../api/use-wall";
import { useEncountersCalendar } from "../api/use-house";
import {
  useEncounterPlaceVisits,
  useEncounterPlaces,
  useObjects,
  usePigeonReach,
  usePigeonReachByItem,
  type EncounterPlaceVisit,
  type ObjectForSale,
} from "../api/use-place";
import { pickLang, useLanguage, useLocalizedPath } from "../language";
import { useWording } from "../wording";
import { DocumentHead } from "../components/document-head";
import { PageHero } from "../components/paz-editorial";
import { FormUnavailable, WorkPicture, isUnavailable, useEraDate } from "../components/wall-parts";
import { NotFoundPage } from "./not-found-page";

function Loading() {
  const w = useWording();
  return (
    <p role="status" className="type-small">
      {w("common.loading")}
    </p>
  );
}

function LoadError({ error }: { error: unknown }) {
  const w = useWording();
  return <StatePanel title={w("common.load-error")} description={toAppError(error).message} />;
}

// ---------------------------------------------------------------------
// Where the pigeons went: copies and countries, never who received them
// ---------------------------------------------------------------------
export function PigeonWherePage() {
  const reach = usePigeonReach();
  const w = useWording();
  return (
    <div>
      <DocumentHead title={w("title.pigeon-where")} path="/pigeon-post/where" />
      <PageHero title={w("title.pigeon-where")} subtitle={w("reach.intro")} />
      <section className="w-reading py-12" aria-label={w("title.pigeon-where")}>
        {reach.isPending && <Loading />}
        {reach.isError && <LoadError error={reach.error} />}
        {reach.data && reach.data.length === 0 && (
          <p className="type-body">{w("empty.pigeon-where")}</p>
        )}
        <ul className="type-body flex flex-col gap-2">
          {(reach.data ?? []).map((r) => (
            <li key={r.country}>
              {w("reach.line", { country: r.country ?? "", copies: r.copies ?? 0 })}
            </li>
          ))}
        </ul>
        <p className="type-small mt-8">{w("reach.never")}</p>
      </section>
    </div>
  );
}

/** One edition's reach, under the edition. Empty until the house has noted where copies went. */
export function PigeonReach({ slug }: { slug: string }) {
  const rows = usePigeonReachByItem();
  const localize = useLocalizedPath();
  const w = useWording();
  const mine = (rows.data ?? []).filter((r) => r.item_slug === slug);
  if (mine.length === 0) return null;
  return (
    <section aria-labelledby="edition-reach" className="border-border border-t pt-6">
      <h2 id="edition-reach" className="type-h4">
        {w("reach.edition-heading")}
      </h2>
      <ul className="type-body mt-2 flex flex-col gap-1">
        {mine.map((r) => (
          <li key={r.country}>
            {w("reach.line", { country: r.country ?? "", copies: r.copies ?? 0 })}
          </li>
        ))}
      </ul>
      <p className="type-small mt-3">
        <Link to={localize("/pigeon-post/where")} className="link-underline">
          {w("reach.all-editions")}
        </Link>
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------
// What can be bought: no checkout. A sale stays a conversation.
// ---------------------------------------------------------------------
function ObjectEnquiry({ object }: { object: ObjectForSale }) {
  const w = useWording();
  const send = useSubmitEnquiry();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const ready = fullName.trim() && email.trim();

  if (send.isSuccess) return <p className="type-body">{w("common.received")}</p>;
  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {w("objects.enquire")}
      </Button>
    );
  }
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        send.mutate({
          fullName: fullName.trim(),
          email: email.trim(),
          message: `${w("objects.enquiry-prefix", { title: object.title ?? "" })}\n\n${message.trim()}`,
        });
      }}
    >
      <Field label={w("offer.your-name")} htmlFor={`obj-${object.slug}-name`}>
        <Input
          id={`obj-${object.slug}-name`}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </Field>
      <Field label={w("objects.email")} htmlFor={`obj-${object.slug}-email`}>
        <Input
          id={`obj-${object.slug}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label={w("objects.message")} htmlFor={`obj-${object.slug}-message`}>
        <Textarea
          id={`obj-${object.slug}-message`}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>
      {send.isError &&
        (isUnavailable(send.error) ? (
          <FormUnavailable />
        ) : (
          <p role="alert" className="text-destructive text-sm">
            {toAppError(send.error).message}
          </p>
        ))}
      <Button type="submit" loading={send.isPending} disabled={!ready} className="self-start">
        {w("common.send")}
      </Button>
    </form>
  );
}

export function ObjectsPage() {
  const objects = useObjects();
  const { lang } = useLanguage();
  const w = useWording();
  return (
    <div>
      <DocumentHead title={w("title.objects")} path="/objects" />
      <PageHero title={w("title.objects")} subtitle={w("objects.intro")} />
      <section className="w-standard py-12" aria-label={w("title.objects")}>
        {objects.isPending && <Loading />}
        {objects.isError && <LoadError error={objects.error} />}
        {objects.data && objects.data.length === 0 && (
          <p className="type-body">{w("empty.objects")}</p>
        )}
        <ul className="flex flex-col gap-12">
          {(objects.data ?? []).map((o) => (
            <li key={o.id} className="border-border flex flex-col gap-3 border-t pt-6">
              <h2 className="type-h3">{pickLang(o.title as string, o.title_ne, lang)}</h2>
              {o.description && (
                <p className="type-body">{pickLang(o.description, o.description_ne, lang)}</p>
              )}
              {o.price_minor != null && (
                <p className="type-body">{formatMoney(o.price_minor, o.currency ?? "NPR")}</p>
              )}
              <ObjectEnquiry object={o} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------
// Places the house has tended: counts only, no names
// ---------------------------------------------------------------------
type ImageJson = {
  original_path: string;
  width: number;
  height: number;
  variants?: unknown;
  alt: string;
  photographer: string;
};

function asPicture(j: unknown) {
  const i = j as ImageJson | null;
  if (!i || typeof i !== "object" || !i.original_path) return null;
  return {
    original_path: i.original_path,
    width: i.width,
    height: i.height,
    variants: i.variants ?? [],
    alt: i.alt,
    photographer: i.photographer,
  };
}

export function PlaceVisit({ visit }: { visit: EncounterPlaceVisit }) {
  const { lang } = useLanguage();
  const eraDate = useEraDate();
  const w = useWording();
  const before = asPicture(visit.before_image);
  const after = asPicture(visit.after_image);
  return (
    <li className="flex flex-col gap-3">
      <p className="type-small">
        {visit.done_on ? eraDate(visit.done_on) : ""}
        {visit.people_count != null ? ` · ${w("places.came", { count: visit.people_count })}` : ""}
      </p>
      {(before || after) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {before && (
            <div>
              <p className="type-label mb-2">{w("places.before")}</p>
              <WorkPicture image={before} sizes="(min-width: 640px) 45vw, 92vw" />
            </div>
          )}
          {after && (
            <div>
              <p className="type-label mb-2">{w("places.after")}</p>
              <WorkPicture image={after} sizes="(min-width: 640px) 45vw, 92vw" />
            </div>
          )}
        </div>
      )}
      {visit.note && <p className="type-body">{pickLang(visit.note, visit.note_ne, lang)}</p>}
    </li>
  );
}

export function PlacesIndexPage() {
  const places = useEncounterPlaces();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const w = useWording();
  return (
    <div>
      <DocumentHead title={w("title.places")} path="/encounters/places" />
      <PageHero title={w("title.places")} />
      <section className="w-reading py-12" aria-label={w("title.places")}>
        {places.isPending && <Loading />}
        {places.isError && <LoadError error={places.error} />}
        {places.data && places.data.length === 0 && (
          <p className="type-body">{w("empty.places")}</p>
        )}
        <ul className="flex flex-col gap-4">
          {(places.data ?? []).map((p) => (
            <li key={p.id}>
              <Link
                to={localize(`/encounters/places/${p.slug}`)}
                className="link-underline font-serif text-xl"
              >
                {pickLang(p.name as string, p.name_ne, lang)}
              </Link>
              {p.location && (
                <p className="type-small">{pickLang(p.location, p.location_ne, lang)}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function PlacePage({ slug }: { slug: string }) {
  const places = useEncounterPlaces();
  const visits = useEncounterPlaceVisits();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const w = useWording();
  if (places.isPending) return <Loading />;
  if (places.isError) return <LoadError error={places.error} />;
  const place = (places.data ?? []).find((p) => p.slug === slug);
  if (!place) return <NotFoundPage />;
  const name = pickLang(place.name as string, place.name_ne, lang);
  const mine = (visits.data ?? []).filter((v) => v.place_slug === slug);
  return (
    <div>
      <DocumentHead title={name} path={`/encounters/places/${slug}`} />
      <PageHero
        title={name}
        subtitle={place.location ? pickLang(place.location, place.location_ne, lang) : undefined}
      />
      <div className="w-standard flex flex-col gap-10 py-12">
        {place.note && <p className="type-body">{pickLang(place.note, place.note_ne, lang)}</p>}
        {mine.length === 0 && <p className="type-body">{w("empty.place-visits")}</p>}
        <ol className="flex flex-col gap-12">
          {mine.map((v) => (
            <PlaceVisit key={v.id} visit={v} />
          ))}
        </ol>
        <p className="type-small">
          <Link to={localize("/encounters/places")} className="link-underline">
            {w("places.all")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function PlaceRoute() {
  const { slug } = useParams<{ slug: string }>();
  return <PlacePage slug={slug ?? ""} />;
}

/** Under an Encounter: what was done at the place it was held, if the house has recorded it. */
export function EncounterPlaceVisits({ slug }: { slug: string }) {
  const visits = useEncounterPlaceVisits();
  const localize = useLocalizedPath();
  const w = useWording();
  const mine = (visits.data ?? []).filter((v) => v.event_slug === slug);
  if (mine.length === 0) return null;
  return (
    <section aria-labelledby="tended" className="border-border border-t pt-6">
      <h2 id="tended" className="type-h4">
        {w("places.tended-here")}
      </h2>
      <ol className="mt-4 flex flex-col gap-10">
        {mine.map((v) => (
          <PlaceVisit key={v.id} visit={v} />
        ))}
      </ol>
      {mine[0]?.place_slug && (
        <p className="type-small mt-4">
          <Link
            to={localize(`/encounters/places/${mine[0].place_slug}`)}
            className="link-underline"
          >
            {w("places.the-place")}
          </Link>
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------
// The afternoons: each craft has its own name. A workshop sells a day,
// never formation.
// ---------------------------------------------------------------------
export function AfternoonsPage({ series }: { series: string }) {
  const cal = useEncountersCalendar();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const eraDate = useEraDate();
  const w = useWording();
  if (cal.isPending) return <Loading />;
  if (cal.isError) return <LoadError error={cal.error} />;
  const mine = (cal.data ?? []).filter((e) => e.series === series);
  if (mine.length === 0) return <NotFoundPage />;
  const name = series
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  return (
    <div>
      <DocumentHead title={name} path={`/afternoons/${series}`} />
      <PageHero title={name} />
      <ol className="w-standard flex flex-col gap-10 py-12">
        {mine.map((e) => (
          <li key={e.id} className="border-border border-t pt-4">
            <p className="type-small">
              {e.starts_on ? eraDate(e.starts_on) : ""}
              {e.ends_on ? ` ${w("afternoons.to")} ${eraDate(e.ends_on)}` : ""}
            </p>
            <h2 className="type-h3">
              <Link to={localize(`/encounters/${e.slug}`)} className="link-underline">
                {pickLang(e.title as string, e.title_ne, lang)}
              </Link>
            </h2>
            {e.place && <p className="type-body">{pickLang(e.place, e.place_ne, lang)}</p>}
            {e.how_to_turn_up && (
              <p className="type-body">{pickLang(e.how_to_turn_up, e.how_to_turn_up_ne, lang)}</p>
            )}
            {e.price_note && (
              <p className="type-body">{pickLang(e.price_note, e.price_note_ne, lang)}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AfternoonsRoute() {
  const { series } = useParams<{ series: string }>();
  return <AfternoonsPage series={series ?? ""} />;
}
