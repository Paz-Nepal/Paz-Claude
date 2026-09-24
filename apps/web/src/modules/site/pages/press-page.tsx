import { Link } from "react-router-dom";
import { useEmptyState } from "../empty-states";
import { useWording, type WordingKey } from "../wording";
import { StatePanel, type RichTextNode, RichText } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem, usePublishedItems, type PublicItemType } from "../api/use-site";
import {
  useLanguage,
  pickLang,
  pickLangDoc,
  isUntranslatedDoc,
  useLocalizedPath,
} from "../language";
import { PageHero, Eyebrow, ArrowLink, Reveal } from "../components/paz-editorial";
import { TranslationNotice } from "../components/translation-notice";

const SERIES: ReadonlyArray<{ type: PublicItemType; label: WordingKey; to: string }> = [
  { type: "paper", label: "series.papers", to: "/papers" },
  { type: "brief", label: "series.brief", to: "/brief" },
  { type: "dispatch", label: "series.dispatch", to: "/dispatch" },
  { type: "annual", label: "series.annual", to: "/annual" },
  { type: "pigeon_post", label: "series.pigeon-post", to: "/pigeon-post" },
];

function SeriesFeed({ type, label, to }: { type: PublicItemType; label: string; to: string }) {
  const items = usePublishedItems(type);
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const w = useWording();
  const empty = useEmptyState();
  const recent = (items.data ?? []).slice(0, 3);

  return (
    <div className="border-border border-t pt-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="type-h3">{label}</h3>
        <ArrowLink to={to}>{w("press.all-series", { series: label })}</ArrowLink>
      </div>
      {recent.length === 0 ? (
        <p className="type-small">{empty("series")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recent.map((item) => (
            <li key={item.id}>
              <Link
                to={localize(`${to}/${item.slug}`)}
                className="link-underline font-serif text-lg"
              >
                {pickLang(item.title ?? "", item.title_ne, lang)}
              </Link>
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
  const w = useWording();

  if (page.isPending)
    return (
      <p role="status" className="type-small p-16 text-center">
        {w("common.loading")}
      </p>
    );
  if (page.isError) {
    return (
      <div className="p-16">
        <StatePanel title={w("common.load-error")} description={toAppError(page.error).message} />
      </div>
    );
  }
  // An organ exists in law before it has written anything. No holding line
  // is invented in the meantime: the organ shows its own hub and no body.
  const data = page.data ?? null;

  const body = pickLangDoc(data?.body, data?.body_ne, lang) as RichTextNode | null;

  return (
    <div>
      <PageHero
        kicker={w("organ.kicker")}
        title={pickLang(data?.title ?? w("press.title"), data?.title_ne, lang)}
        subtitle={data?.subtitle ? pickLang(data?.subtitle, data?.subtitle_ne, lang) : undefined}
      />
      {(isUntranslatedDoc(data?.body_ne, lang) || body) && (
        <div className="w-reading py-16">
          {isUntranslatedDoc(data?.body_ne, lang) && <TranslationNotice />}
          {body && <RichText doc={body} className="rich-text" />}
        </div>
      )}

      <section className="w-wide border-border border-t py-16 md:py-24">
        <Reveal>
          <Eyebrow>{w("press.deposited-here")}</Eyebrow>
        </Reveal>
        <h2 className="type-h2 mb-10">{w("press.every-series")}</h2>
        <div className="grid gap-10 md:grid-cols-2">
          {SERIES.map((s) => (
            <SeriesFeed key={s.type} type={s.type} label={w(s.label)} to={s.to} />
          ))}
          <div className="border-border border-t pt-8">
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="type-h3">{w("press.sattal")}</h3>
              <ArrowLink to="/sattal">{w("press.all-pieces")}</ArrowLink>
            </div>
            <p className="type-small">{w("press.sattal-note")}</p>
          </div>
        </div>
        <div className="mt-12">
          <ArrowLink to="/send-a-pigeon">{w("press.send-pigeon")}</ArrowLink>
        </div>
      </section>
    </div>
  );
}
