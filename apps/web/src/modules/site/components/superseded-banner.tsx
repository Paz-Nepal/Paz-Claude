import { Link } from "react-router-dom";

/** Non-negotiable §3: corrections happen by addition, never by editing
 * the original in place — this is how a reader finds the newer version. */
export function SupersededBanner({
  basePath,
  slug,
}: {
  basePath: string;
  slug: string | null | undefined;
}) {
  if (!slug) return null;
  return (
    <p className="border-b bg-black/5 px-4 py-3 text-sm">
      A correction has been deposited.{" "}
      <Link to={`${basePath}/${slug}`} className="font-medium underline">
        See the newer version
      </Link>
      .
    </p>
  );
}
