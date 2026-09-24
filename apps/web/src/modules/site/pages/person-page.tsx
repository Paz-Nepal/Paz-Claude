import { Link, useParams } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import {
  usePerson,
  usePersonExhibitions,
  usePersonWritings,
  useSattalPieces,
  useShowWorkLinks,
  useShows,
  useWorkImages,
  useWorks,
} from "../api/use-wall";
import { pickLang, useLanguage, useLocalizedPath } from "../language";
import { useEmptyState } from "../empty-states";
import { useWording } from "../wording";
import { DocumentHead } from "../components/document-head";
import { NotPublished } from "../components/published-body";
import { WorkPicture, useEraDate } from "../components/wall-parts";

/**
 * An artist page: the name, large and first; their own statement; their
 * work, sold work included; where they have shown, here and elsewhere;
 * what has been written about them. Never sales performance, never a list
 * of collectors, never adjectives from the house (Build Specification 6.2).
 * People the gallery does not represent get pages too.
 */
export function PersonPage() {
  const { slug } = useParams<{ slug: string }>();
  const person = usePerson(slug);
  const p = person.data;
  const works = useWorks(p?.id ?? undefined);
  const images = useWorkImages((works.data ?? []).map((w) => w.id as string));
  const shows = useShows();
  const links = useShowWorkLinks();
  const elsewhere = usePersonExhibitions(p?.id ?? undefined);
  const writings = usePersonWritings(p?.id ?? undefined);
  const pieces = useSattalPieces();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const eraDate = useEraDate();
  const t = useWording();
  const empty = useEmptyState();

  if (person.isPending)
    return (
      <p role="status" className="type-small p-16 text-center">
        {t("common.loading")}
      </p>
    );
  if (person.isError) {
    return (
      <div className="p-16">
        <StatePanel title={t("common.load-error")} description={toAppError(person.error).message} />
      </div>
    );
  }
  if (!p) return <NotPublished />;

  const name = pickLang(p.name as string, p.name_ne, lang);
  const statement = pickLang(p.statement ?? "", p.statement_ne, lang);
  const whole = new Map(
    (images.data ?? []).filter((i) => i.frame === "whole").map((i) => [i.work_id, i]),
  );
  const workIds = new Set((works.data ?? []).map((w) => w.id));
  const showIds = new Set(
    (links.data ?? []).filter((l) => l.work_id && workIds.has(l.work_id)).map((l) => l.show_id),
  );
  const hungHere = (shows.data ?? []).filter((s) => showIds.has(s.id));
  const writtenAbout = (pieces.data ?? []).filter((x) => x.subject_person_id === p.id);

  return (
    <article>
      <DocumentHead title={name} path={`/people/${p.slug}`} />
      <header className="w-wide pb-10 pt-32 md:pt-40">
        <h1 className="type-display">{name}</h1>
        {!p.active && <p className="type-small mt-4">{t("person.kept")}</p>}
      </header>

      {statement && (
        <section className="w-reading pb-12" aria-labelledby="statement">
          <h2 id="statement" className="type-caption mb-3">
            {t("person.own-words")}
          </h2>
          <p className="type-body whitespace-pre-line">{statement}</p>
        </section>
      )}

      <section className="w-wide border-border border-t py-12" aria-labelledby="work">
        <h2 id="work" className="type-h2">
          {t("person.work")}
        </h2>
        {works.data && works.data.length === 0 && (
          <p className="type-body mt-4">{empty("artistNoWork")}</p>
        )}
        <ul className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {(works.data ?? []).map((w) => {
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
                  {w.year ?? ""}
                  {w.availability === "sold"
                    ? w.year
                      ? `. ${t("person.sold")}`
                      : t("person.sold")
                    : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {(hungHere.length > 0 || (elsewhere.data ?? []).length > 0) && (
        <section className="w-standard border-border border-t py-12" aria-labelledby="shown">
          <h2 id="shown" className="type-h2">
            {t("person.where-shown")}
          </h2>
          <ul className="mt-6 flex flex-col gap-3">
            {hungHere.map((s) => (
              <li key={s.id}>
                <Link to={localize(`/shows/${s.slug}`)} className="link-underline">
                  {pickLang(s.title as string, s.title_ne, lang)}
                </Link>
                <span className="type-small">
                  {` · ${t("person.at-house")} · `}
                  {s.opened_on ? eraDate(s.opened_on) : ""}
                </span>
              </li>
            ))}
            {(elsewhere.data ?? []).map((e) => (
              <li key={e.id}>
                {e.title}
                <span className="type-small">
                  {e.place ? ` · ${e.place}` : ""}
                  {e.year ? ` · ${e.year}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(writtenAbout.length > 0 || (writings.data ?? []).length > 0) && (
        <section className="w-standard border-border border-t py-12" aria-labelledby="written">
          <h2 id="written" className="type-h2">
            {t("person.written-about")}
          </h2>
          <ul className="mt-6 flex flex-col gap-3">
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
            {(writings.data ?? []).map((w) => (
              <li key={w.id}>
                {w.url ? (
                  <a href={w.url} rel="noopener noreferrer" className="link-underline">
                    {w.title}
                  </a>
                ) : (
                  w.title
                )}
                <span className="type-small">
                  {" · "}
                  {w.source}
                  {w.year ? `, ${w.year}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
