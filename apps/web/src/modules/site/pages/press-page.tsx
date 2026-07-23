import { StatePanel, type RichTextNode, RichText } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem, usePublishedItems, type PublicItemType } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc } from "../language";
import { PageHero, Eyebrow, ArrowLink, Reveal } from "../components/paz-editorial";
import { NotPublished } from "../components/published-body";

const SERIES = [
  { type: "paper" as const, label: "Papers", to: "/papers" },
  { type: "brief" as const, label: "Brief", to: "/brief" },
  { type: "dispatch" as const, label: "Dispatch", to: "/dispatch" },
  { type: "annual" as const, label: "Annual", to: "/annual" },
  { type: "pigeon_post" as const, label: "Pigeon Post", to: "/pigeon-post" },
];

function SeriesFeed({ type, label, to }: { type: PublicItemType; label: string; to: string }) {
  const items = usePublishedItems(type);
  const { lang } = useLanguage();
  const recent = (items.data ?? []).slice(0, 3);

  return (
    <div className="border-border border-t pt-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="type-h3">{label}</h3>
        <ArrowLink to={to}>All {label}</ArrowLink>
      </div>
      {recent.length === 0 ? (
        <p className="type-small">Nothing deposited yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recent.map((item) => (
            <li key={item.id}>
              <a href={`${to}/${item.slug}`} className="link-underline font-serif text-lg">
                {pickLang(item.title ?? "", item.title_ne, lang)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PressPage() {
  const page = usePublishedItem("page", "press");
  const { lang } = useLanguage();

  if (page.isPending) return <p className="type-small p-16 text-center">Loading…</p>;
  if (page.isError) {
    return (
      <div className="p-16">
        <StatePanel title="Couldn't load this." description={toAppError(page.error).message} />
      </div>
    );
  }
  if (!page.data) return <NotPublished />;

  const body = pickLangDoc(page.data.body, page.data.body_ne, lang) as RichTextNode | null;

  return (
    <div>
      <PageHero
        kicker="An organ of the house"
        title={pickLang(page.data.title ?? "The Press", page.data.title_ne, lang)}
        subtitle={
          page.data.subtitle ? pickLang(page.data.subtitle, page.data.subtitle_ne, lang) : undefined
        }
      />
      {body && (
        <div className="w-reading py-16">
          <RichText doc={body} className="rich-text" />
        </div>
      )}

      <section className="w-wide border-border border-t py-16 md:py-24">
        <Reveal>
          <Eyebrow>Deposited here</Eyebrow>
        </Reveal>
        <h2 className="type-h2 mb-10">Every series the Press keeps</h2>
        <div className="grid gap-10 md:grid-cols-2">
          {SERIES.map((s) => (
            <SeriesFeed key={s.type} type={s.type} label={s.label} to={s.to} />
          ))}
        </div>
        <div className="mt-12">
          <ArrowLink to="/send-a-pigeon">
            Send a pigeon — contribute something you noticed
          </ArrowLink>
        </div>
      </section>
    </div>
  );
}
