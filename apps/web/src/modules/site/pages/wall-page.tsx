import { Link } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePeople, useShows, useWorkImages, useWorks } from "../api/use-wall";
import { pickLang, useLanguage, useLocalizedPath } from "../language";
import { emptyState } from "../empty-states";
import { DocumentHead } from "../components/document-head";
import { PageHero } from "../components/paz-editorial";
import { PersonLink, WorkPicture, useEraDate } from "../components/wall-parts";

/**
 * The Wall. The subject is the people sheltering under the roof, not the
 * roof: painters and authors come first, then the work, then the shows.
 * Nothing is sorted, filtered or grouped by price (Build Specification
 * 6.7). A person who has left stays out of these current listings; their
 * page, their works and their shows remain reachable (6.6).
 */
export function WallPage() {
  const people = usePeople();
  const works = useWorks();
  const shows = useShows();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const eraDate = useEraDate();

  const current = (people.data ?? []).filter((p) => p.active);
  const currentIds = new Set(current.map((p) => p.id));
  const listed = (works.data ?? [])
    .filter((w) => w.person_id && currentIds.has(w.person_id))
    .slice(0, 24);
  const images = useWorkImages(listed.map((w) => w.id).filter((id): id is string => Boolean(id)));
  const whole = new Map(
    (images.data ?? []).filter((i) => i.frame === "whole").map((i) => [i.work_id, i]),
  );

  return (
    <div>
      <DocumentHead title="The Wall" path="/wall" />
      <PageHero title="The Wall" />

      <section className="w-standard py-12" aria-labelledby="wall-people">
        <h2 id="wall-people" className="type-h2">
          People
        </h2>
        {people.isPending && (
          <p role="status" className="type-small mt-4">
            Loading…
          </p>
        )}
        {people.isError && (
          <StatePanel title="Couldn't load this." description={toAppError(people.error).message} />
        )}
        {people.data && current.length === 0 && (
          <p className="type-body mt-4">{emptyState("wall")}</p>
        )}
        <ul className="mt-6 flex flex-col gap-2">
          {current.map((p) => (
            <li key={p.id} className="font-serif text-2xl">
              <PersonLink
                slug={p.slug as string}
                name={pickLang(p.name as string, p.name_ne, lang)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="w-wide border-border border-t py-12" aria-labelledby="wall-works">
        <h2 id="wall-works" className="type-h2">
          Work
        </h2>
        {works.isPending && (
          <p role="status" className="type-small mt-4">
            Loading…
          </p>
        )}
        <ul className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {listed.map((w) => {
            const img = whole.get(w.id);
            return (
              <li key={w.id}>
                {img && (
                  <Link
                    to={localize(`/works/${w.slug}`)}
                    aria-label={pickLang(w.title as string, w.title_ne, lang)}
                  >
                    <WorkPicture
                      image={img}
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                    />
                  </Link>
                )}
                <p className="mt-3 font-serif text-lg">
                  <Link to={localize(`/works/${w.slug}`)} className="link-underline">
                    {pickLang(w.title as string, w.title_ne, lang)}
                  </Link>
                </p>
                <p className="type-small">
                  {pickLang(w.person_name as string, w.person_name_ne, lang)}
                  {w.year ? `, ${w.year}` : ""}
                  {w.availability === "sold" ? ". Sold." : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="w-standard border-border border-t py-12" aria-labelledby="wall-shows">
        <h2 id="wall-shows" className="type-h2">
          Shows
        </h2>
        {shows.data && shows.data.length === 0 && (
          <p className="type-body mt-4">{emptyState("shows")}</p>
        )}
        <ol className="mt-6 flex flex-col gap-4">
          {(shows.data ?? []).map((s) => (
            <li key={s.id}>
              <Link to={localize(`/shows/${s.slug}`)} className="link-underline font-serif text-xl">
                {pickLang(s.title as string, s.title_ne, lang)}
              </Link>
              <p className="type-small">
                {s.opened_on ? eraDate(s.opened_on) : ""}
                {s.closed_on ? ` to ${eraDate(s.closed_on)}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
