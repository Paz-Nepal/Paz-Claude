import { Link } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { formatKathmanduTime } from "@paz/utils";
import { useProgramSessions } from "@/modules/programs";
import { usePublishedItems, useSiteInfo } from "../api/use-site";
import { ArticleCard } from "../components/article-card";
import { Reveal, Eyebrow, ArrowLink } from "../components/paz-editorial";

const ORGANS = [
  {
    to: "/house",
    label: "The House",
    desc: "Hospitality, welcome, and the ground everything else is built on.",
  },
  { to: "/hearth", label: "The Hearth", desc: "The table, the menu, and reservations." },
  { to: "/press", label: "The Press", desc: "Papers, Brief, Dispatch, Annual, and Pigeon Post." },
  { to: "/guild", label: "The Guild", desc: "Craft, practice, and the people who carry it." },
  {
    to: "/the-record",
    label: "The Record",
    desc: "The public deposit index — kept, in order, forever.",
  },
  { to: "/treasury", label: "The Treasury", desc: "What sustains the institution, and how." },
];

export function HomePage() {
  const siteInfo = useSiteInfo();
  const articles = usePublishedItems("article");
  const sessions = useProgramSessions();

  const siteName = siteInfo.data?.["site.name"] ?? "PAZ";
  const tagline = siteInfo.data?.["site.tagline"];
  const upcoming = (sessions.data ?? []).slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="border-border flex flex-col items-center gap-8 border-b py-28 text-center md:py-40">
        <Reveal>
          <p className="type-label">Kathmandu · Est. 2026</p>
          <h1 className="type-display mt-6">{siteName}</h1>
        </Reveal>
        {tagline && (
          <Reveal delay={150}>
            <p className="type-body-lg w-standard !px-0">{tagline}</p>
          </Reveal>
        )}
        <Reveal delay={280}>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-6">
            <Link
              to="/house"
              className="type-caption border-foreground hover:bg-foreground hover:text-background inline-flex items-center gap-2 border px-8 py-4 transition-colors"
            >
              Visit the House
            </Link>
            <ArrowLink to="/about">Our mission</ArrowLink>
          </div>
        </Reveal>
      </section>

      {/* Upcoming */}
      <section className="border-border border-b py-16 md:py-24">
        <div className="w-standard">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <Eyebrow>Programmes</Eyebrow>
              <h2 className="type-h2">What is happening now</h2>
            </div>
            <div className="hidden md:block">
              <ArrowLink to="/programmes">Full calendar</ArrowLink>
            </div>
          </div>
          {upcoming.length === 0 ? (
            <StatePanel title="Nothing scheduled yet." description="Check back soon." />
          ) : (
            upcoming.map((s, i) => (
              <Reveal key={s.id} delay={i * 60}>
                <Link
                  to={`/programmes/${s.program_slug}`}
                  className="border-border group flex items-start gap-6 border-t py-6"
                >
                  <div className="text-center">
                    <div className="font-serif text-3xl leading-none">
                      {s.starts_at ? new Date(s.starts_at).getDate() : ""}
                    </div>
                    <div className="type-caption mt-1">
                      {s.starts_at ? formatKathmanduTime(s.starts_at) : ""}
                    </div>
                  </div>
                  <div>
                    <h3 className="type-h4 group-hover:text-brand transition-colors">
                      {s.program_title}
                    </h3>
                    {s.venue_name && <p className="type-small mt-1">{s.venue_name}</p>}
                  </div>
                </Link>
              </Reveal>
            ))
          )}
        </div>
      </section>

      {/* From the journal */}
      <section className="border-border border-b py-16 md:py-24" aria-labelledby="latest-heading">
        <div className="w-wide">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <Eyebrow>Journal</Eyebrow>
              <h2 id="latest-heading" className="type-h2">
                From the journal
              </h2>
            </div>
            <div className="hidden md:block">
              <ArrowLink to="/journal">All entries</ArrowLink>
            </div>
          </div>
          {articles.data &&
            (articles.data.length === 0 ? (
              <StatePanel
                title="Nothing published yet."
                description="New writing will appear here."
              />
            ) : (
              <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {articles.data.slice(0, 6).map((item, i) => (
                  <Reveal key={item.id} delay={i * 80}>
                    <ArticleCard item={item} />
                  </Reveal>
                ))}
              </div>
            ))}
        </div>
      </section>

      {/* The Organs */}
      <section className="bg-secondary/40 py-16 md:py-24">
        <div className="w-wide">
          <Reveal>
            <Eyebrow>The institution</Eyebrow>
            <h2 className="type-h2 max-w-lg">Six organs keep the house</h2>
          </Reveal>
          <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {ORGANS.map((organ, i) => (
              <Reveal key={organ.to} delay={i * 70}>
                <Link to={organ.to} className="group flex flex-col gap-2">
                  <h3 className="type-h3 group-hover:text-brand transition-colors">
                    {organ.label}
                  </h3>
                  <p className="type-body">{organ.desc}</p>
                  <span className="type-caption text-brand group-hover:text-foreground mt-1 inline-flex items-center gap-2 transition-colors">
                    Enter
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12h14m-6-6 6 6-6 6"
                      />
                    </svg>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
