import { Link } from "react-router-dom";
import { RichText, StatePanel, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePeople, useShows, useWorkImages, useWorks } from "../api/use-wall";
import { pickLang, pickLangDoc, useLanguage, useLocalizedPath } from "../language";
import { usePublishedItem } from "../api/use-site";
import { useEmptyState } from "../empty-states";
import { useWording } from "../wording";
import { BriefSignup } from "../components/brief-signup";
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
  const viewing = usePublishedItem("page", "viewing");
  const shipping = usePublishedItem("page", "shipping");
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const eraDate = useEraDate();
  const t = useWording();
  const empty = useEmptyState();

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
      <DocumentHead title={t("title.wall")} path="/wall" />
      <PageHero title={t("title.wall")} />
      {/* Viewing is by arrangement, and what ships and roughly what it costs is
          answered before an enquiry. The words are the house's: each shows only
          once the house has published its page. */}
      {[viewing.data, shipping.data].map((item) =>
        item ? (
          <div key={item.id} className="w-reading pt-8">
            <RichText
              doc={pickLangDoc(item.body, item.body_ne, lang) as RichTextNode | null}
              className="rich-text"
            />
          </div>
        ) : null,
      )}

      <section className="w-standard py-12" aria-labelledby="wall-people">
        <h2 id="wall-people" className="type-h2">
          {t("wall.people")}
        </h2>
        {people.isPending && (
          <p role="status" className="type-small mt-4">
            {t("common.loading")}
          </p>
        )}
        {people.isError && (
          <StatePanel
            title={t("common.load-error")}
            description={toAppError(people.error).message}
          />
        )}
        {people.data && current.length === 0 && <p className="type-body mt-4">{empty("wall")}</p>}
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
          {t("wall.work")}
        </h2>
        {works.isPending && (
          <p role="status" className="type-small mt-4">
            {t("common.loading")}
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
                  {w.availability === "sold" ? `. ${t("wall.sold")}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="w-standard border-border border-t py-12" aria-labelledby="wall-shows">
        <h2 id="wall-shows" className="type-h2">
          {t("wall.shows")}
        </h2>
        {shows.data && shows.data.length === 0 && (
          <p className="type-body mt-4">{empty("shows")}</p>
        )}
        <ol className="mt-6 flex flex-col gap-4">
          {(shows.data ?? []).map((s) => (
            <li key={s.id}>
              <Link to={localize(`/shows/${s.slug}`)} className="link-underline font-serif text-xl">
                {pickLang(s.title as string, s.title_ne, lang)}
              </Link>
              <p className="type-small">
                {s.opened_on ? eraDate(s.opened_on) : ""}
                {s.closed_on ? ` ${t("wall.to", { date: eraDate(s.closed_on) })}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>
      <div className="w-standard pb-16">
        <BriefSignup />
      </div>
    </div>
  );
}
