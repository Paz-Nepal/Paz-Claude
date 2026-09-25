import { Link, useParams } from "react-router-dom";
import { RichText, StatePanel, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatBikramSambatDate, formatKathmanduDate, formatKathmanduTime } from "@paz/utils";
import { usePublishedItem, useSiteInfo } from "../api/use-site";
import { useShows, useWorks } from "../api/use-wall";
import {
  useChronicleOnThisDay,
  useHouseBooks,
  useHouseDayDates,
  useHouseDays,
  useHouseRoomImages,
  useHouseRooms,
  useHouseStudioMonths,
  useHouseThings,
  useHouseWanted,
  type HouseRoom,
} from "../api/use-place";
import { pickLang, useLanguage, useLocalizedPath } from "../language";
import { useWording } from "../wording";
import { DocumentHead } from "../components/document-head";
import { PageHero } from "../components/paz-editorial";
import { OfferForm } from "../components/offer-form";
import { PersonLink, WorkPicture, useEraDate } from "../components/wall-parts";
import { ShellPage } from "./house-pages";
import { NotFoundPage } from "./not-found-page";

/**
 * "Is anyone home": one line, changed from the desk. Hidden when empty. It
 * changes by the hour, so it is never part of the static pages.
 */
export function HouseStatusLine({ className }: { className?: string }) {
  const info = useSiteInfo();
  const { lang } = useLanguage();
  const w = useWording();
  const en = info.data?.["house.status"];
  const ne = info.data?.["house.status_ne"];
  const setAt = info.data?.["house.status_set_at"];
  const line = en ? pickLang(en, ne, lang) : "";
  if (!line) return null;
  return (
    <p className={`type-body-lg ${className ?? ""}`} role="status">
      {line}
      {setAt && (
        <span className="type-small ml-3">
          {w("place.status-as-of", { time: formatKathmanduTime(setAt) })}
        </span>
      )}
    </p>
  );
}

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
// Rooms
// ---------------------------------------------------------------------
export function RoomsPage() {
  const rooms = useHouseRooms();
  const images = useHouseRoomImages();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const w = useWording();
  const first = new Map<string, NonNullable<typeof images.data>[number]>();
  for (const i of images.data ?? [])
    if (i.room_id && !first.has(i.room_id)) first.set(i.room_id, i);

  return (
    <div>
      <DocumentHead title={w("title.rooms")} path="/house/rooms" />
      <PageHero title={w("title.rooms")} />
      <section className="w-standard py-12" aria-label={w("title.rooms")}>
        {rooms.isPending && <Loading />}
        {rooms.isError && <LoadError error={rooms.error} />}
        {rooms.data && rooms.data.length === 0 && <p className="type-body">{w("empty.rooms")}</p>}
        <ul className="grid gap-10 sm:grid-cols-2">
          {(rooms.data ?? []).map((r) => {
            const img = r.id ? first.get(r.id) : undefined;
            return (
              <li key={r.id}>
                {img && (
                  <Link
                    to={localize(`/house/rooms/${r.slug}`)}
                    aria-label={pickLang(r.name as string, r.name_ne, lang)}
                  >
                    <WorkPicture image={img} sizes="(min-width: 640px) 45vw, 92vw" />
                  </Link>
                )}
                <p className="mt-3 font-serif text-xl">
                  <Link to={localize(`/house/rooms/${r.slug}`)} className="link-underline">
                    {pickLang(r.name as string, r.name_ne, lang)}
                  </Link>
                </p>
                {r.floor && <p className="type-small">{r.floor}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export function RoomPage({ slug }: { slug: string }) {
  const rooms = useHouseRooms();
  const images = useHouseRoomImages();
  const things = useHouseThings();
  const works = useWorks();
  const months = useHouseStudioMonths();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const eraDate = useEraDate();
  const w = useWording();

  if (rooms.isPending) return <Loading />;
  if (rooms.isError) return <LoadError error={rooms.error} />;
  const room: HouseRoom | undefined = (rooms.data ?? []).find((r) => r.slug === slug);
  if (!room) return <NotFoundPage />;

  const name = pickLang(room.name as string, room.name_ne, lang);
  const mine = (images.data ?? []).filter((i) => i.room_id === room.id);
  const here = (things.data ?? []).filter((t) => t.room_id === room.id);
  const hanging = (works.data ?? []).filter((x) => x.room_id === room.id);
  const isStudio = room.slug === "studio";
  const today = new Date().toISOString().slice(0, 10);
  const nowMonth = (months.data ?? []).find(
    (m) => m.from_on && m.to_on && m.from_on <= today && today <= m.to_on,
  );
  const earlier = (months.data ?? []).filter((m) => m !== nowMonth);

  return (
    <div>
      <DocumentHead title={name} path={`/house/rooms/${room.slug}`} />
      <PageHero title={name} subtitle={room.floor ?? undefined} />
      <div className="w-standard flex flex-col gap-12 py-12">
        {room.note && <p className="type-body">{pickLang(room.note, room.note_ne, lang)}</p>}
        {mine.length > 0 && (
          <ul className="grid gap-8 sm:grid-cols-2">
            {mine.map((i) => (
              <li key={i.id}>
                <WorkPicture
                  image={{ ...i, alt: pickLang(i.alt as string, i.alt_ne, lang) }}
                  sizes="(min-width: 640px) 45vw, 92vw"
                />
              </li>
            ))}
          </ul>
        )}
        {isStudio && (
          <section aria-labelledby="studio-now">
            <h2 id="studio-now" className="type-h3">
              {w("place.studio-now")}
            </h2>
            {nowMonth ? (
              <p className="type-body mt-3">
                {nowMonth.person_slug && nowMonth.person_name ? (
                  <PersonLink slug={nowMonth.person_slug} name={nowMonth.person_name} />
                ) : null}
                {nowMonth.to_on
                  ? `, ${w("place.studio-until", { date: eraDate(nowMonth.to_on) })}`
                  : ""}
              </p>
            ) : (
              <p className="type-body mt-3">{w("empty.studio")}</p>
            )}
            {earlier.length > 0 && (
              <>
                <h3 className="type-h4 mt-8">{w("place.studio-past")}</h3>
                <ul className="type-body mt-3 flex flex-col gap-1">
                  {earlier.map((m) => (
                    <li key={m.id}>
                      {m.person_slug && m.person_name ? (
                        <PersonLink slug={m.person_slug} name={m.person_name} />
                      ) : null}
                      {m.from_on ? ` · ${eraDate(m.from_on)}` : ""}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
        {hanging.length > 0 && (
          <section aria-labelledby="room-works">
            <h2 id="room-works" className="type-h3">
              {w("place.works-here")}
            </h2>
            <ul className="type-body mt-3 flex flex-col gap-1">
              {hanging.map((x) => (
                <li key={x.id}>
                  <Link to={localize(`/works/${x.slug}`)} className="link-underline">
                    {pickLang(x.title as string, x.title_ne, lang)}
                  </Link>
                  {x.person_name ? `, ${pickLang(x.person_name, x.person_name_ne, lang)}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}
        {here.length > 0 && (
          <section aria-labelledby="room-things">
            <h2 id="room-things" className="type-h3">
              {w("place.things-here")}
            </h2>
            <ul className="type-body mt-3 flex flex-col gap-1">
              {here.map((t) => (
                <li key={t.id}>{pickLang(t.name as string, t.name_ne, lang)}</li>
              ))}
            </ul>
          </section>
        )}
        <p className="type-small">
          <Link to={localize("/house/rooms")} className="link-underline">
            {w("place.back-to-rooms")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function RoomRoute() {
  const { slug } = useParams<{ slug: string }>();
  return <RoomPage slug={slug ?? ""} />;
}

// ---------------------------------------------------------------------
// Things, and what the house would welcome
// ---------------------------------------------------------------------
export function ThingsPage() {
  const things = useHouseThings();
  const rooms = useHouseRooms();
  const wanted = useHouseWanted();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const w = useWording();
  const roomById = new Map((rooms.data ?? []).map((r) => [r.id, r]));
  const welcome = (wanted.data ?? []).filter((x) => x.kind === "thing");

  return (
    <div>
      <DocumentHead title={w("title.things")} path="/house/things" />
      <PageHero title={w("title.things")} />
      <div className="w-standard flex flex-col gap-14 py-12">
        <section aria-label={w("title.things")}>
          {things.isPending && <Loading />}
          {things.isError && <LoadError error={things.error} />}
          {things.data && things.data.length === 0 && (
            <p className="type-body">{w("empty.things")}</p>
          )}
          <ul className="flex flex-col gap-8">
            {(things.data ?? []).map((t) => {
              const room = t.room_id ? roomById.get(t.room_id) : undefined;
              return (
                <li key={t.id} className="flex flex-col gap-2">
                  {t.image_path && (
                    <div className="max-w-md">
                      <WorkPicture
                        image={{
                          original_path: t.image_path,
                          width: t.image_width,
                          height: t.image_height,
                          variants: t.image_variants,
                          alt: t.image_alt,
                          photographer: t.image_photographer,
                        }}
                        sizes="(min-width: 640px) 28rem, 92vw"
                      />
                    </div>
                  )}
                  <p className="font-serif text-xl">
                    {pickLang(t.name as string, t.name_ne, lang)}
                  </p>
                  {t.came_from && (
                    <p className="type-body">
                      {w("place.came-from", { place: pickLang(t.came_from, t.came_from_ne, lang) })}
                    </p>
                  )}
                  {t.given_by && (
                    <p className="type-body">{w("place.given-by", { name: t.given_by })}</p>
                  )}
                  <p className="type-small">
                    {room && room.slug && (
                      <Link to={localize(`/house/rooms/${room.slug}`)} className="link-underline">
                        {pickLang(room.name as string, room.name_ne, lang)}
                      </Link>
                    )}
                    {t.for_use && (
                      <span>
                        {room ? " · " : ""}
                        {w("place.for-use")}
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="welcome" className="border-border border-t pt-10">
          <h2 id="welcome" className="type-h3">
            {w("place.welcome")}
          </h2>
          {welcome.length === 0 ? (
            <p className="type-body mt-3">{w("empty.wanted")}</p>
          ) : (
            <ul className="type-body mt-3 flex flex-col gap-3">
              {welcome.map((x) => (
                <li key={x.id}>
                  {pickLang(x.what as string, x.what_ne, lang)}
                  {x.note && (
                    <span className="type-small block">{pickLang(x.note, x.note_ne, lang)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="offer-thing" className="border-border border-t pt-10">
          <h2 id="offer-thing" className="type-h3">
            {w("place.offer-thing")}
          </h2>
          <p className="type-body mb-6 mt-3">{w("place.offer-thing-note")}</p>
          <OfferForm
            kind="thing"
            asks={[
              { key: "subject", label: "offer.thing-what", required: true },
              { key: "note", label: "offer.thing-story", type: "textarea" },
            ]}
          />
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// The reading room: a room to read in, not a lending library
// ---------------------------------------------------------------------
export function ReadingRoomPage() {
  const books = useHouseBooks();
  const wanted = useHouseWanted();
  const { lang } = useLanguage();
  const w = useWording();
  const welcome = (wanted.data ?? []).filter((x) => x.kind === "book");
  const shelves = new Map<string, NonNullable<typeof books.data>>();
  for (const b of books.data ?? []) {
    const key = b.shelf ?? "";
    shelves.set(key, [...(shelves.get(key) ?? []), b]);
  }

  return (
    <div>
      <DocumentHead title={w("title.reading-room")} path="/reading-room" />
      <PageHero title={w("title.reading-room")} subtitle={w("place.reading-room-note")} />
      <div className="w-standard flex flex-col gap-14 py-12">
        <section aria-label={w("title.reading-room")}>
          {books.isPending && <Loading />}
          {books.isError && <LoadError error={books.error} />}
          {books.data && books.data.length === 0 && <p className="type-body">{w("empty.books")}</p>}
          {[...shelves.entries()].map(([shelf, list]) => (
            <div key={shelf || "none"} className="mb-10">
              {shelf && <h2 className="type-h4 mb-3">{shelf}</h2>}
              <ul className="type-body flex flex-col gap-3">
                {list.map((b) => (
                  <li key={b.id}>
                    <span className="font-serif">{b.title}</span>
                    {b.author ? `, ${b.author}` : ""}
                    {b.language ? ` · ${b.language}` : ""}
                    {b.note && (
                      <span className="type-small block">{pickLang(b.note, b.note_ne, lang)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section aria-labelledby="books-welcome" className="border-border border-t pt-10">
          <h2 id="books-welcome" className="type-h3">
            {w("place.books-welcome")}
          </h2>
          {welcome.length === 0 ? (
            <p className="type-body mt-3">{w("empty.wanted")}</p>
          ) : (
            <ul className="type-body mt-3 flex flex-col gap-2">
              {welcome.map((x) => (
                <li key={x.id}>{pickLang(x.what as string, x.what_ne, lang)}</li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="offer-book" className="border-border border-t pt-10">
          <h2 id="offer-book" className="type-h3">
            {w("place.offer-book")}
          </h2>
          <div className="mt-6">
            <OfferForm
              kind="book"
              asks={[
                { key: "subject", label: "offer.book-title", required: true },
                { key: "ref.author", label: "offer.book-author" },
                { key: "note", label: "offer.book-note", type: "textarea" },
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// The house's year: the days it keeps, for the coming twelve months. Lunar
// days move, so each date is entered by the house, never worked out.
// ---------------------------------------------------------------------
export function TheYearPage() {
  const days = useHouseDays();
  const dates = useHouseDayDates();
  const { lang } = useLanguage();
  const w = useWording();

  const today = new Date();
  const from = new Date(today.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const to = new Date(today.getTime() + 366 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const dayById = new Map((days.data ?? []).map((d) => [d.id, d]));
  const coming = (dates.data ?? [])
    .filter(
      (x) =>
        x.falls_on && x.falls_on >= from && x.falls_on <= to && x.day_id && dayById.has(x.day_id),
    )
    .sort((a, b) => (a.falls_on as string).localeCompare(b.falls_on as string));

  const reckoning = (r: string | null) =>
    r === "nepal_sambat"
      ? w("place.reckon-nepal-sambat")
      : r === "bikram_sambat"
        ? w("place.reckon-bikram-sambat")
        : w("place.reckon-gregorian");

  return (
    <div>
      <DocumentHead title={w("title.the-year")} path="/the-year" />
      <PageHero title={w("title.the-year")} />
      <section className="w-reading py-12" aria-label={w("title.the-year")}>
        {(days.isPending || dates.isPending) && <Loading />}
        {days.isError && <LoadError error={days.error} />}
        {dates.isSuccess && coming.length === 0 && <p className="type-body">{w("empty.year")}</p>}
        <ol className="flex flex-col gap-10">
          {coming.map((x) => {
            const d = dayById.get(x.day_id);
            if (!d) return null;
            const date = new Date(`${(x.falls_on as string).slice(0, 10)}T12:00:00Z`);
            return (
              <li key={x.id}>
                <p className="type-small">
                  {formatKathmanduDate(date)} · {formatBikramSambatDate(date)}
                  {x.sambat_text ? ` · ${x.sambat_text}` : ""}
                </p>
                <h2 className="type-h3">{pickLang(d.name as string, d.name_ne, lang)}</h2>
                <p className="type-small">{reckoning(d.reckoning)}</p>
                {d.reckoned_as && (
                  <p className="type-small">{pickLang(d.reckoned_as, d.reckoned_as_ne, lang)}</p>
                )}
                {d.what_the_house_does && (
                  <p className="type-body mt-2">
                    {pickLang(d.what_the_house_does, d.what_the_house_does_ne, lang)}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------
// Pages the house writes: shown as its own words once published, and the
// page says so plainly until then.
// ---------------------------------------------------------------------
export function AtTheHousePage() {
  const things = useHouseThings();
  const { lang } = useLanguage();
  const w = useWording();
  const forUse = (things.data ?? []).filter((t) => t.for_use);
  return (
    <ShellPage slug="at-the-house" title={w("title.at-the-house")}>
      {forUse.length > 0 && (
        <section className="w-reading border-border border-t py-10" aria-labelledby="for-use">
          <h2 id="for-use" className="type-h3">
            {w("place.for-use-list")}
          </h2>
          <ul className="type-body mt-4 flex flex-col gap-1">
            {forUse.map((t) => (
              <li key={t.id}>{pickLang(t.name as string, t.name_ne, lang)}</li>
            ))}
          </ul>
        </section>
      )}
    </ShellPage>
  );
}

export function FindingTheHousePage() {
  const w = useWording();
  return <ShellPage slug="finding-the-house" title={w("title.finding-the-house")} />;
}

/** The standing welcome to the tole and the school, Nepali first whichever language was chosen. */
export function NeighboursPage() {
  const item = usePublishedItem("page", "neighbours");
  const w = useWording();
  const en = item.data?.body as RichTextNode | null | undefined;
  const ne = item.data?.body_ne as RichTextNode | null | undefined;
  const hasNe =
    Array.isArray((ne as { content?: unknown[] } | null | undefined)?.content) &&
    ((ne as { content: unknown[] }).content.length ?? 0) > 0;
  const hasEn =
    Array.isArray((en as { content?: unknown[] } | null | undefined)?.content) &&
    ((en as { content: unknown[] }).content.length ?? 0) > 0;
  const title = item.data?.title_ne?.trim() || item.data?.title || w("title.neighbours");

  return (
    <div>
      <DocumentHead title={title} path="/neighbours" />
      <PageHero title={title} />
      <div className="w-reading flex flex-col gap-10 py-12">
        {item.isPending && <Loading />}
        {item.isError && <LoadError error={item.error} />}
        {item.isSuccess && !hasNe && !hasEn && (
          <p className="type-body">{w("common.not-written")}</p>
        )}
        {hasNe && ne && (
          <div lang="ne">
            <RichText doc={ne} className="rich-text" />
          </div>
        )}
        {hasEn && en && (
          <div lang="en">
            <RichText doc={en} className="rich-text" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The home page's lines that change by the day: the show on the walls, who is
 * making in the studio, and what the house did on this date in an earlier
 * year. Each is hidden when there is nothing to say, and none is written into
 * the static page.
 */
export function HomeTodaySection() {
  const shows = useShows();
  const months = useHouseStudioMonths();
  const onThisDay = useChronicleOnThisDay();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const eraDate = useEraDate();
  const w = useWording();

  const today = new Date().toISOString().slice(0, 10);
  const show = (shows.data ?? []).find(
    (s) => s.opened_on && s.opened_on <= today && (!s.closed_on || s.closed_on >= today),
  );
  const making = (months.data ?? []).find(
    (m) => m.from_on && m.to_on && m.from_on <= today && today <= m.to_on,
  );
  const lines = onThisDay.data ?? [];
  if (!show && !making && lines.length === 0) return null;

  return (
    <section
      className="w-standard border-border flex flex-col gap-8 border-b py-12"
      aria-label={w("home.today-label")}
    >
      {show && (
        <p className="type-body-lg">
          <span className="type-label mr-3">{w("home.show-now")}</span>
          <Link to={localize(`/shows/${show.slug}`)} className="link-underline">
            {pickLang(show.title as string, show.title_ne, lang)}
          </Link>
        </p>
      )}
      {making && making.person_slug && making.person_name && (
        <p className="type-body-lg">
          <span className="type-label mr-3">{w("home.studio-now")}</span>
          <PersonLink slug={making.person_slug} name={making.person_name} />
        </p>
      )}
      {lines.length > 0 && (
        <div>
          <p className="type-label mb-2">{w("home.on-this-day")}</p>
          <ul className="type-body flex flex-col gap-2">
            {lines.map((l) => (
              <li key={l.id}>
                <span className="type-small">{l.line_on ? eraDate(l.line_on) : ""}</span> {l.line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
