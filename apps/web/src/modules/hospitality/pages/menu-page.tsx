import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatCents } from "@paz/utils";
import { usePublicMenu } from "../api/use-hospitality";
import type { PublicMenuRow } from "../api/use-hospitality";

function groupBySection(rows: PublicMenuRow[]) {
  const bySection = new Map<string, { name: string; position: number; items: PublicMenuRow[] }>();
  for (const row of rows) {
    if (!row.section_id) continue;
    const existing = bySection.get(row.section_id);
    if (existing) {
      existing.items.push(row);
    } else {
      bySection.set(row.section_id, {
        name: row.section_name ?? "",
        position: row.section_position ?? 0,
        items: [row],
      });
    }
  }
  return [...bySection.values()].sort((a, b) => a.position - b.position);
}

export function MenuPage() {
  const menu = usePublicMenu();

  if (menu.isPending) return <p className="text-muted-foreground p-8">Loading…</p>;
  if (menu.isError) {
    return (
      <div className="p-8">
        <StatePanel title="Couldn't load the menu." description={toAppError(menu.error).message} />
      </div>
    );
  }

  const sections = groupBySection(menu.data ?? []);

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">Menu</h1>
      </header>
      {sections.length === 0 ? (
        <StatePanel title="No menu published yet." description="Check back soon." />
      ) : (
        sections.map((section) => (
          <section key={section.name} className="flex flex-col gap-4">
            <h2 className="font-serif text-xl">{section.name}</h2>
            <ul className="flex flex-col gap-3">
              {section.items.map((item) => (
                <li key={item.item_id} className="flex items-baseline justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.item_name}</p>
                    {item.item_description && (
                      <p className="text-muted-foreground text-sm">{item.item_description}</p>
                    )}
                    {Array.isArray(item.dietary) && item.dietary.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        {(item.dietary as string[]).join(" · ")}
                      </p>
                    )}
                  </div>
                  {item.price_cents != null && (
                    <span className="text-muted-foreground shrink-0 text-sm">
                      {formatCents(item.price_cents)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
