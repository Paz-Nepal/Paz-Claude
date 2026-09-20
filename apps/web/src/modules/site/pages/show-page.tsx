import { Link, useParams } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useShow, useShowWorkLinks, useWorkImages, useWorks } from "../api/use-wall";
import { pickLang, useLanguage, useLocalizedPath } from "../language";
import { DocumentHead } from "../components/document-head";
import { NotPublished } from "../components/published-body";
import { PersonLink, WorkPicture, useEraDate } from "../components/wall-parts";

/**
 * A show page persists after closing, holding what hung, when and whose.
 * There is no current-versus-past hierarchy: dated, in order, kept (Build
 * Specification 6.5). The site never advertises opening hours; viewing is
 * by arrangement.
 */
export function ShowPage() {
  const { slug } = useParams<{ slug: string }>();
  const show = useShow(slug);
  const s = show.data;
  const links = useShowWorkLinks();
  const works = useWorks();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const eraDate = useEraDate();

  const ids = new Set((links.data ?? []).filter((l) => l.show_id === s?.id).map((l) => l.work_id));
  const hung = (works.data ?? []).filter((w) => ids.has(w.id));
  const images = useWorkImages(hung.map((w) => w.id as string));

  if (show.isPending) return <p className="type-small p-16 text-center">Loading…</p>;
  if (show.isError) {
    return (
      <div className="p-16">
        <StatePanel title="Couldn't load this." description={toAppError(show.error).message} />
      </div>
    );
  }
  if (!s) return <NotPublished />;

  const title = pickLang(s.title as string, s.title_ne, lang);
  const text = pickLang((s.text ?? ""), s.text_ne, lang);
  const whole = new Map(
    (images.data ?? []).filter((i) => i.frame === "whole").map((i) => [i.work_id, i]),
  );

  return (
    <article>
      <DocumentHead title={title} path={`/shows/${s.slug}`} />
      <header className="w-wide pb-10 pt-32 md:pt-40">
        <h1 className="type-h1">{title}</h1>
        <p className="type-small mt-3">
          {s.opened_on ? eraDate(s.opened_on) : ""}
          {s.closed_on ? ` to ${eraDate(s.closed_on)}` : ""}
        </p>
      </header>

      {text && (
        <section className="w-reading pb-10">
          <p className="type-caption mb-2">The house writes</p>
          <p className="type-body whitespace-pre-line">{text}</p>
        </section>
      )}

      <section className="w-wide border-border border-t py-12" aria-labelledby="hung">
        <h2 id="hung" className="type-h2">
          What hung
        </h2>
        {hung.length === 0 && <p className="type-body mt-4">Nothing is listed yet.</p>}
        <ul className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {hung.map((w) => {
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
                  <PersonLink
                    slug={w.person_slug as string}
                    name={pickLang(w.person_name as string, w.person_name_ne, lang)}
                  />
                  {w.year ? `, ${w.year}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </article>
  );
}
