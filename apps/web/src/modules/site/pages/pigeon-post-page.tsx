import { useParams } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePigeonPost, publicMediaUrl } from "../api/use-site";
import { DepositProvenance } from "../components/deposit-provenance";
import { NotPublished } from "../components/published-body";

/** No author_name field is read or rendered anywhere in this page -- there
 * is none to read (spec §2/§5: Pigeon Post is anonymous on the page). */
export function PigeonPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = usePigeonPost(slug);

  if (post.isPending) return <p className="text-muted-foreground p-8">Loading…</p>;
  if (post.isError) {
    return (
      <div className="p-8">
        <StatePanel title="Couldn't load this." description={toAppError(post.error).message} />
      </div>
    );
  }
  if (!post.data) return <NotPublished />;

  const item = post.data;

  return (
    <article className="max-w-reading mx-auto flex flex-col gap-6 px-6 py-16">
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
      <DepositProvenance depositRef={item.deposit_ref} />
    </article>
  );
}
