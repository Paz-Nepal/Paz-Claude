import { StatePanel, type RichTextNode, RichText } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePublishedItem } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc } from "../language";
import { PageHero, Eyebrow, Reveal } from "../components/paz-editorial";
import { NotPublished } from "../components/published-body";

export function HousePage() {
  const page = usePublishedItem("page", "house");
  const visit = usePublishedItem("page", "visit");
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
  const visitBody = visit.data
    ? (pickLangDoc(visit.data.body, visit.data.body_ne, lang) as RichTextNode | null)
    : null;

  return (
    <div>
      <PageHero
        kicker="An organ of the house"
        title={pickLang(page.data.title ?? "The House", page.data.title_ne, lang)}
        subtitle={
          page.data.subtitle ? pickLang(page.data.subtitle, page.data.subtitle_ne, lang) : undefined
        }
      />
      {body && (
        <div className="w-reading py-16">
          <RichText doc={body} className="rich-text" />
        </div>
      )}

      {visit.data && (
        <section className="border-border bg-secondary/40 border-t py-16 md:py-24">
          <div className="w-standard">
            <Reveal>
              <Eyebrow>Visiting</Eyebrow>
              <h2 className="type-h2">
                {pickLang(visit.data.title ?? "Visit", visit.data.title_ne, lang)}
              </h2>
            </Reveal>
            {visitBody && (
              <div className="mt-8">
                <RichText doc={visitBody} className="rich-text" />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
