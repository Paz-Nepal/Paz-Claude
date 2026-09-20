import { Link } from "react-router-dom";
import { formatKathmanduTime } from "@paz/utils";
import { useProgramSessions } from "@/modules/programs";
import { useSiteInfo } from "../api/use-site";
import { useChronicle, useSattalPieces, useWorkImages, useWorks } from "../api/use-wall";
import { DocumentHead } from "../components/document-head";
import { ArrowLink, Eyebrow } from "../components/paz-editorial";
import { WorkPicture, useEraDate } from "../components/wall-parts";
import { pickLang, useLanguage, useLocalizedPath } from "../language";
import { emptyState } from "../empty-states";

/**
 * The subject of this site is the people sheltering under the roof, not
 * the roof (Build Specification 1). So the home page leads with the work
 * and the writing of painters and authors; the house's own explanations
 * are the colophon. The house's description of itself is blocked: the
 * site tagline is shown only if the house has supplied one.
 */
export function HomePage() {
  const siteInfo = useSiteInfo();
  const works = useWorks();
  const pieces = useSattalPieces();
  const chronicle = useChronicle();
  const sessions = useProgramSessions();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const eraDate = useEraDate();

  const siteName = siteInfo.data?.["site.name"] ?? "PAZ";
  const tagline = siteInfo.data?.["site.tagline"];
  const recent = (works.data ?? []).filter((w) => w.person_active).slice(0, 6);
  const images = useWorkImages(recent.map((w) => w.id as string));
  const whole = new Map(
    (images.data ?? []).filter((i) => i.frame === "whole").map((i) => [i.work_id, i]),
  );
  const upcoming = (sessions.data ?? []).slice(0, 3);

  return (
    <div>
      <DocumentHead title={siteName} description={tagline || undefined} path="/" ogType="website" />

      <section className="border-border w-wide border-b pb-12 pt-32 md:pb-16 md:pt-40">
        <p className="type-label">Patan, Lalitpur</p>
        <h1 className="type-display mt-4">{siteName}</h1>
        {tagline && <p className="type-body-lg mt-6 max-w-2xl">{tagline}</p>}
      </section>

      <section className="w-wide border-border border-b py-14" aria-labelledby="home-wall">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <Eyebrow>The Wall</Eyebrow>
            <h2 id="home-wall" className="type-h2">
              Recent work
            </h2>
          </div>
          <ArrowLink to="/wall">The Wall</ArrowLink>
        </div>
        {works.data && recent.length === 0 && <p className="type-body">{emptyState("wall")}</p>}
        <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((w) => {
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
                  {pickLang(w.person_name as string, w.person_name_ne, lang)}
                </p>
                <p className="type-small">
                  <Link to={localize(`/works/${w.slug}`)} className="link-underline">
                    {pickLang(w.title as string, w.title_ne, lang)}
                  </Link>
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="w-standard border-border border-b py-14" aria-labelledby="home-sattal">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <Eyebrow>The Press</Eyebrow>
            <h2 id="home-sattal" className="type-h2">
              The Sattal
            </h2>
          </div>
          <ArrowLink to="/sattal">All pieces</ArrowLink>
        </div>
        {pieces.data && pieces.data.length === 0 && (
          <p className="type-body">{emptyState("sattal")}</p>
        )}
        <ol className="flex flex-col gap-6">
          {(pieces.data ?? []).slice(0, 3).map((x) => (
            <li key={x.id} className="speaker speaker-signed">
              <p className="font-serif text-xl">
                <Link to={localize(`/sattal/${x.slug}`)} className="link-underline">
                  {pickLang(x.title as string, x.title_ne, lang)}
                </Link>
              </p>
              <p className="type-small">
                {pickLang(x.person_name as string, x.person_name_ne, lang)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="w-standard border-border border-b py-14" aria-labelledby="home-chronicle">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <Eyebrow>The House</Eyebrow>
            <h2 id="home-chronicle" className="type-h2">
              The Chronicle
            </h2>
          </div>
          <ArrowLink to="/chronicle">The whole run</ArrowLink>
        </div>
        {chronicle.data && chronicle.data.length === 0 && (
          <p className="type-body">{emptyState("chronicle")}</p>
        )}
        <ol className="flex flex-col gap-3">
          {(chronicle.data ?? []).slice(0, 5).map((l) => (
            <li key={l.id} className="type-body">
              <span className="type-small">{l.line_on ? eraDate(l.line_on) : ""}</span> {l.line}
            </li>
          ))}
        </ol>
      </section>

      {upcoming.length > 0 && (
        <section className="w-standard border-border border-b py-14" aria-labelledby="home-prog">
          <div className="mb-6 flex items-end justify-between">
            <h2 id="home-prog" className="type-h2">
              Coming up
            </h2>
            <ArrowLink to="/programmes">Programmes</ArrowLink>
          </div>
          {upcoming.map((s) => (
            <Link
              key={s.id}
              to={localize(`/programmes/${s.program_slug}`)}
              className="border-border group flex items-start gap-6 border-t py-5"
            >
              <span className="type-caption w-40 shrink-0">
                {s.starts_at ? formatKathmanduTime(s.starts_at) : ""}
              </span>
              <span className="type-h4 group-hover:text-brand transition-colors">
                {s.program_title}
              </span>
            </Link>
          ))}
        </section>
      )}

      {/* The six organs, all shown alike, as the colophon of the site. */}
      <nav className="w-wide py-14" aria-label="The six organs">
        <ul className="type-body flex flex-wrap gap-x-8 gap-y-2">
          {[
            ["/house", "House"],
            ["/record", "Record"],
            ["/guild", "Guild"],
            ["/press", "Press"],
            ["/hearth", "Hearth"],
            ["/treasury", "Treasury"],
          ].map(([to, label]) => (
            <li key={to}>
              <Link to={localize(to as string)} className="link-underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
