import { Navigate, useParams } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePigeonPost, publicMediaUrl } from "../api/use-site";
import { DepositProvenance } from "../components/deposit-provenance";
import { SupersededBanner } from "../components/superseded-banner";
import { ResolveNotFoundPage } from "./resolve-not-found-page";
import { SpeakerNote } from "../components/wall-parts";
import { DocumentHead } from "../components/document-head";
import { useLocalizedPath } from "../language";

/** No author_name field is read or rendered anywhere in this page -- there
 * is none to read (spec §2/§5: Pigeon Post is anonymous on the page). */
export function PigeonPostPage({ slug: slugProp }: { slug?: string } = {}) {
  const params = useParams<{ slug: string; deposit: string }>();
  const slug = slugProp ?? params.slug;
  const localize = useLocalizedPath();
  const post = usePigeonPost(slug);

  if (post.isPending) return <p className="text-muted-foreground p-8">Loading…</p>;
  if (post.isError) {
    return (
      <div className="p-8">
        <StatePanel title="Couldn't load this." description={toAppError(post.error).message} />
      </div>
    );
  }
  if (!post.data) return <ResolveNotFoundPage />;
  // The deposit number is the canonical address; the readable slug
  // redirects to it, never the reverse (Build Specification 4.10).
  if (!params.deposit && post.data.deposit_ref) {
    return <Navigate to={localize(`/record/${post.data.deposit_ref}`)} replace />;
  }

  const item = post.data;

  return (
    <article className="max-w-reading mx-auto flex flex-col gap-6 px-6 py-16">
      <SpeakerNote speaker="anonymous" />
      <DocumentHead
        title={item.title ?? ""}
        description="A quiet keepsake from Pigeon Post, kept in the Record."
        path={`/pigeon-post/${item.slug}`}
        ogType="article"
        depositRef={item.deposit_ref}
        seriesName="Pigeon Post"
      />
      <SupersededBanner basePath="/pigeon-post" slug={item.superseded_by_slug} />
      <header className="flex flex-col gap-2">
        {item.edition_no && <p className="text-muted-foreground text-sm">{item.edition_no}</p>}
        <h1 className="font-serif text-4xl">{item.title}</h1>
      </header>
      {item.pdf_path && (
        <a
          href={publicMediaUrl(item.pdf_path)}
          className="self-start rounded-lg border px-4 py-2 text-sm font-medium hover:bg-black/5"
        >
          View the keepsake
        </a>
      )}
      <DepositProvenance
        series="Pigeon Post"
        title={item.title ?? ""}
        depositRef={item.deposit_ref}
      />
    </article>
  );
}
