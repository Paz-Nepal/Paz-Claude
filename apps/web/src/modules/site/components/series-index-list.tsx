import type * as React from "react";
import { Link } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { useLanguage, pickLang, useLocalizedPath } from "../language";
import type { PublishedItem } from "../api/use-site";

/**
 * Shared list chrome for the archive/index page of a series (Brief,
 * Dispatch, Pigeon Post, Annual, Papers) -- one query shape
 * (api.published_items filtered by type), one empty state, one bilingual
 * title. What differs per series (number, date, anonymity) is the caller's
 * `secondary` render prop, not a fork of this component.
 */
export function SeriesIndexList({
  items,
  basePath,
  emptyTitle,
  secondary,
}: {
  items: PublishedItem[] | undefined;
  basePath: string;
  emptyTitle: string;
  secondary?: (item: PublishedItem) => React.ReactNode;
}) {
  const { lang } = useLanguage();
  const localize = useLocalizedPath();

  if (!items) return null;
  if (items.length === 0) {
    return <StatePanel title={emptyTitle} description="Nothing deposited here yet." />;
  }

  return (
    <ul className="flex flex-col gap-6">
      {items.map((item) => (
        <li key={item.id} className="border-b pb-6 last:border-0">
          <Link
            to={localize(`${basePath}/${item.slug}`)}
            className="font-serif text-xl hover:underline"
          >
            {pickLang(item.title ?? "", item.title_ne, lang)}
          </Link>
          {secondary && <div className="text-muted-foreground mt-1 text-sm">{secondary(item)}</div>}
        </li>
      ))}
    </ul>
  );
}
