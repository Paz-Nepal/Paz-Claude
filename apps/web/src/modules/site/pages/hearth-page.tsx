import { StatePanel, type RichTextNode, RichText } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatCents } from "@paz/utils";
import { usePublicMenu } from "@/modules/hospitality";
import { usePublishedItem } from "../api/use-site";
import { useLanguage, pickLang, pickLangDoc } from "../language";
import { PageHero, Eyebrow, ArrowLink, Reveal } from "../components/paz-editorial";
import { NotPublished } from "../components/published-body";

export function HearthPage() {
  const page = usePublishedItem("page", "hearth");
  const menu = usePublicMenu();
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
  const preview = (menu.data ?? []).slice(0, 6);

  return (
    <div>
      <PageHero
        kicker="An organ of the house"
        title={pickLang(page.data.title ?? "The Hearth", page.data.title_ne, lang)}
        subtitle={
          page.data.subtitle ? pickLang(page.data.subtitle, page.data.subtitle_ne, lang) : undefined
        }
      />
      {body && (
        <div className="w-reading py-16">
          <RichText doc={body} className="rich-text" />
        </div>
      )}

      <section className="border-border border-t py-16 md:py-24">
        <div className="w-standard">
          <Reveal>
            <Eyebrow>At the table</Eyebrow>
            <div className="flex items-end justify-between">
              <h2 className="type-h2">The menu</h2>
              <ArrowLink to="/menu">Full menu</ArrowLink>
            </div>
          </Reveal>
          {preview.length === 0 ? (
            <p className="type-body mt-6">No menu published yet.</p>
          ) : (
            <ul className="mt-8 flex flex-col gap-3">
              {preview.map((item) => (
                <li
                  key={item.item_id}
                  className="border-border flex items-baseline justify-between border-t pt-3"
                >
                  <span className="font-serif text-lg">{item.item_name}</span>
                  {item.price_cents != null && (
                    <span className="type-small">{formatCents(item.price_cents)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="border-border bg-secondary/50 border-y py-16 text-center md:py-24">
        <div className="w-standard">
          <Reveal>
            <h2 className="type-h2">Come to the table</h2>
            <p className="type-body-lg max-w-reading mx-auto mt-6">
              A person confirms every reservation — expect a reply, not an instant confirmation.
            </p>
            <a
              href="/reservations"
              className="type-caption border-foreground hover:bg-foreground hover:text-background mt-10 inline-flex items-center gap-2 border px-8 py-4 transition-colors"
            >
              Reserve a table
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
