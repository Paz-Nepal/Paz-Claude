import { Link, Navigate, useParams } from "react-router-dom";
import { RichText, StatePanel, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import {
  useSattalCorrections,
  useSattalPiece,
  useSattalPieces,
  useSattalReaders,
  type SattalPiece,
} from "../api/use-wall";
import { pickLang, useLanguage, useLocalizedPath } from "../language";
import { emptyState } from "../empty-states";
import { DocumentHead } from "../components/document-head";
import { NotPublished } from "../components/published-body";
import { PageHero } from "../components/paz-editorial";
import { SpeakerNote, useEraDate } from "../components/wall-parts";
import { BriefSignup } from "../components/brief-signup";
import { TermsLink } from "./more-pages";

const FORM_LABEL: Record<string, string> = {
  study: "Study",
  review: "Review",
  account: "Account",
};

const LANGUAGE_LABEL: Record<string, string> = {
  en: "English",
  ne: "Nepali",
  new: "Nepal Bhasa",
};

/**
 * The Sattal's front page: signed work by independent authors. It says
 * plainly that nothing about work the house shows, sells or has formed,
 * and nothing critical of PAZ, is published until a named outside reader
 * exists, and who that reader is once there is one (Build Specification
 * 7.2). No issues, no cadence, no board.
 */
export function SattalIndexPage() {
  const pieces = useSattalPieces();
  const readers = useSattalReaders();
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const eraDate = useEraDate();
  const hasReader = (readers.data ?? []).length > 0;

  return (
    <div>
      <DocumentHead title="The Sattal" path="/sattal" />
      <PageHero title="The Sattal" kicker="Signed work by authors who are not the house" />

      <section className="w-reading py-10" aria-labelledby="sattal-rule">
        <h2 id="sattal-rule" className="sr-only">
          The rule
        </h2>
        <SpeakerNote speaker="signed" />
        <p className="type-body mt-4">
          Work the house shows, sells or has formed, and anything critical of PAZ, is published here
          only when an author unconnected to it has written it and a named outside reader, whom the
          house cannot overrule, has accepted it.
        </p>
        <p className="type-small mt-4">
          <TermsLink kind="writers">The Sattal&rsquo;s terms</TermsLink>
        </p>
        {readers.isSuccess &&
          (hasReader ? (
            <p className="type-body mt-4">
              {(readers.data ?? []).length === 1
                ? "The outside reader is "
                : "The outside readers are "}
              {(readers.data ?? []).map((r) => r.name).join(", ")}.
            </p>
          ) : (
            <p className="type-body mt-4">
              No outside reader has been named yet, so nothing in that category is published.
            </p>
          ))}
      </section>

      <section className="w-standard border-border border-t py-10" aria-label="Pieces">
        {pieces.isPending && (
          <p role="status" className="type-small">
            Loading…
          </p>
        )}
        {pieces.isError && (
          <StatePanel title="Couldn't load this." description={toAppError(pieces.error).message} />
        )}
        {pieces.data && pieces.data.length === 0 && (
          <p className="type-body">{emptyState("sattal")}</p>
        )}
        <ol className="flex flex-col gap-8">
          {(pieces.data ?? []).map((x) => (
            <li key={x.id} className="speaker speaker-signed">
              <p className="type-caption">
                {FORM_LABEL[x.form ?? ""] ?? x.form} no. {x.piece_number}
                {x.published_at ? ` · ${eraDate(x.published_at)}` : ""}
              </p>
              <p className="font-serif text-2xl">
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
    </div>
  );
}

// ---------------------------------------------------------------------
// The piece: an A4 leaf carried onto the screen.
// ---------------------------------------------------------------------
const KEY = /\[\[([^\]]+)\]\]/g;

function nodeText(node: RichTextNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(nodeText).join("");
}

function keysIn(node: RichTextNode): string[] {
  const out: string[] = [];
  for (const m of nodeText(node).matchAll(KEY)) if (m[1]) out.push(m[1]);
  return out;
}

/** Source keys are written [[key]] in the text and shown as [key] in the line. */
function showKeys(node: RichTextNode): RichTextNode {
  if (node.type === "text") return { ...node, text: (node.text ?? "").replace(KEY, "[$1]") };
  if (!node.content) return node;
  return { ...node, content: node.content.map(showKeys) };
}

interface Source {
  key: string;
  text: string;
}

function blocksOf(doc: unknown): RichTextNode[] {
  const content = (doc as { content?: RichTextNode[] } | null)?.content;
  return Array.isArray(content) ? content : [];
}

function Block({ node }: { node: RichTextNode }) {
  return <RichText doc={{ type: "doc", content: [showKeys(node)] }} className="rich-text" />;
}

function Margin({ node, sources }: { node: RichTextNode | undefined; sources: Source[] }) {
  if (!node) return <div />;
  const keys = keysIn(node);
  if (keys.length === 0) return <div />;
  return (
    <aside className="sattal-margin type-small" aria-label="Sources for this passage">
      <ul className="flex flex-col gap-1">
        {keys.map((k) => (
          <li key={k}>
            <span className="font-semibold">[{k}]</span>{" "}
            {sources.find((s) => s.key === k)?.text ?? ""}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Leaf({ piece }: { piece: SattalPiece }) {
  const sources = ((piece.sources ?? []) as unknown as Source[]).filter((s) => s && s.key);
  const en = blocksOf(piece.body);
  const ne = blocksOf(piece.body_ne);
  const parallel = ne.length > 0 && en.length > 0;

  if (!parallel) {
    const only = en.length > 0 ? en : ne;
    const isNe = en.length === 0 && ne.length > 0;
    return (
      <div className="sattal-leaf" lang={isNe ? "ne" : undefined}>
        {only.map((node, i) => (
          <div key={i} className="sattal-row">
            <Block node={node} />
            <Margin node={node} sources={sources} />
          </div>
        ))}
      </div>
    );
  }

  // Facing originals: genuinely parallel, the translation beside rather
  // than instead (7.5). The original is marked as such.
  const rows = Math.max(en.length, ne.length);
  const originalIsNe = piece.original_language !== "en";
  return (
    <div className="sattal-leaf">
      <div className="sattal-row sattal-row-parallel type-caption">
        <p lang="en">English{originalIsNe ? ", translation" : ", the original"}</p>
        <p lang="ne">नेपाली</p>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sattal-row sattal-row-parallel">
          <div lang="en">{en[i] && <Block node={en[i]} />}</div>
          <div lang="ne">{ne[i] && <Block node={ne[i]} />}</div>
        </div>
      ))}
      {originalIsNe && (
        <p className="type-small mt-6">
          Original language:{" "}
          {LANGUAGE_LABEL[piece.original_language ?? ""] ?? piece.original_language}. The
          translation is set beside it.
        </p>
      )}
      {sources.length > 0 && (
        <aside className="sattal-margin type-small mt-8" aria-label="Sources">
          <ul className="flex flex-col gap-1">
            {sources.map((s) => (
              <li key={s.key}>
                <span className="font-semibold">[{s.key}]</span> {s.text}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}

export function SattalPiecePage({ slug: slugProp }: { slug?: string }) {
  const params = useParams<{ slug: string; deposit: string }>();
  const slug = slugProp ?? params.slug;
  const piece = useSattalPiece(slug);
  const all = useSattalPieces();
  const corrections = useSattalCorrections(piece.data?.id ?? undefined);
  const { lang } = useLanguage();
  const localize = useLocalizedPath();
  const eraDate = useEraDate();

  if (piece.isPending)
    return (
      <p role="status" className="type-small p-16 text-center">
        Loading…
      </p>
    );
  if (piece.isError) {
    return (
      <div className="p-16">
        <StatePanel title="Couldn't load this." description={toAppError(piece.error).message} />
      </div>
    );
  }
  const x = piece.data;
  if (!x) return <NotPublished />;
  // The deposit number is the canonical address; the readable slug
  // redirects to it, never the reverse (Build Specification 4.10).
  if (!params.deposit && x.deposit_ref) {
    return <Navigate to={localize(`/record/${x.deposit_ref}`)} replace />;
  }

  const title = pickLang(x.title as string, x.title_ne, lang);
  const author = pickLang(x.person_name as string, x.person_name_ne, lang);
  const original = all.data?.find((o) => o.id === x.reply_to_piece_id);
  const replies = (all.data ?? []).filter((o) => o.reply_to_piece_id === x.id);
  const translation = all.data?.find((o) => o.id === x.translation_of || o.translation_of === x.id);

  return (
    <article className="w-wide pb-24 pt-32 md:pt-40">
      <DocumentHead
        title={`${title}, ${author}`}
        path={`/sattal/${x.slug}`}
        ogType="article"
        depositRef={x.deposit_ref}
        seriesName="The Sattal"
      />

      {/* Running head: the author's name. */}
      <p className="type-caption border-border border-b pb-2">{author}</p>

      <header className="mt-8 flex flex-col gap-3">
        <p className="type-caption">
          {FORM_LABEL[x.form ?? ""] ?? x.form} no. {x.piece_number}
        </p>
        <h1 className="type-h1 max-w-4xl">{title}</h1>
        <p className="type-body">{author}</p>
        {original && (
          <p className="type-small">
            A reply to{" "}
            <Link to={localize(`/sattal/${original.slug}`)} className="link-underline">
              {pickLang(original.title as string, original.title_ne, lang)}
            </Link>
            .
          </p>
        )}
        {translation && (
          <p className="type-small">
            <Link to={localize(`/sattal/${translation.slug}`)} className="link-underline">
              The other-language text
            </Link>
          </p>
        )}
      </header>

      <div className="mt-10">
        <Leaf piece={x} />
      </div>

      {/* The foot returns to the house: the hairline rule, the apparatus
          set smaller, the declaration of relation, the seal line, the
          colophon. */}
      <footer className="border-border mt-16 max-w-[66ch] border-t pt-6">
        <div className="type-small flex flex-col gap-3">
          {(corrections.data ?? []).length > 0 && (
            <div>
              <p className="font-semibold">Corrections, by addition</p>
              <ul className="mt-1 flex flex-col gap-1">
                {(corrections.data ?? []).map((c) => (
                  <li key={c.id}>
                    {c.added_at ? `${eraDate(c.added_at)}. ` : ""}
                    {c.note}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p>
            <span className="font-semibold">Relation to the subject.</span> {x.relation_declaration}
          </p>
          {x.outside_reader_name && (
            <p>
              <span className="font-semibold">Accepted by the outside reader</span>{" "}
              {x.outside_reader_name}
              {x.reader_accepted_on ? `, ${eraDate(x.reader_accepted_on)}` : ""}.
            </p>
          )}
          {(x.subject_work_slug || x.subject_person_slug) && (
            <p>
              <span className="font-semibold">About.</span>{" "}
              {x.subject_work_slug && (
                <Link to={localize(`/works/${x.subject_work_slug}`)} className="link-underline">
                  {x.subject_work_title}
                </Link>
              )}
              {x.subject_work_slug && x.subject_person_slug ? ", " : ""}
              {x.subject_person_slug && (
                <Link to={localize(`/people/${x.subject_person_slug}`)} className="link-underline">
                  {x.subject_person_name}
                </Link>
              )}
            </p>
          )}
          <SpeakerNote speaker="signed" />
          <p>
            Sattal piece no. {x.piece_number}. Deposited in the Record as {x.deposit_ref}.
          </p>
        </div>
      </footer>

      {/* Right of reply: a reply is a signed, numbered, deposited piece
          that appears on the original's page as a reply. There is no
          comment box anywhere on this site (7.4). */}
      {replies.length > 0 && (
        <section
          className="border-border mt-12 max-w-[66ch] border-t pt-6"
          aria-labelledby="replies"
        >
          <h2 id="replies" className="type-h3">
            Replies
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {replies.map((r) => (
              <li key={r.id}>
                <Link
                  to={localize(`/sattal/${r.slug}`)}
                  className="link-underline font-serif text-xl"
                >
                  {pickLang(r.title as string, r.title_ne, lang)}
                </Link>
                <p className="type-small">
                  {pickLang(r.person_name as string, r.person_name_ne, lang)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-16">
        <BriefSignup />
      </div>
    </article>
  );
}
