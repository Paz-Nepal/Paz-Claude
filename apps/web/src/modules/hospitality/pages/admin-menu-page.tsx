import * as React from "react";
import { Button, Field, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatCents } from "@paz/utils";
import {
  useAdminMenus,
  useSaveMenu,
  useAdminMenuSections,
  useSaveMenuSection,
  useAdminMenuItems,
  useSaveMenuItem,
} from "../api/use-hospitality";

export function AdminMenuPage() {
  const menus = useAdminMenus();
  const saveMenu = useSaveMenu();
  const [selectedMenuId, setSelectedMenuId] = React.useState<string | null>(null);
  const [slug, setSlug] = React.useState("");
  const [name, setName] = React.useState("");

  const selected = menus.data?.find((m) => m.id === selectedMenuId) ?? null;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl">Menus</h1>

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!slug.trim() || !name.trim()) return;
          saveMenu.mutate(
            { id: null, slug, name, status: "draft", validFrom: null, validTo: null },
            {
              onSuccess: (id) => {
                setSlug("");
                setName("");
                if (id) setSelectedMenuId(id);
              },
            },
          );
        }}
      >
        <Field label="Slug" htmlFor="menu-slug">
          <Input id="menu-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>
        <Field label="Name" htmlFor="menu-name">
          <Input id="menu-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Button type="submit" size="sm" loading={saveMenu.isPending}>
          New menu
        </Button>
      </form>
      {saveMenu.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(saveMenu.error).message}
        </p>
      )}

      {menus.data && menus.data.length > 0 && (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Select menu">
          {menus.data.map((m) => (
            <Button
              key={m.id}
              type="button"
              size="sm"
              variant={m.id === selectedMenuId ? "primary" : "ghost"}
              onClick={() => setSelectedMenuId(m.id)}
            >
              {m.name} {m.status === "draft" ? "(draft)" : ""}
            </Button>
          ))}
        </div>
      )}

      {selected?.id && (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{selected.name}</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={saveMenu.isPending}
              onClick={() =>
                saveMenu.mutate({
                  id: selected.id,
                  slug: selected.slug ?? "",
                  name: selected.name ?? "",
                  status: selected.status === "published" ? "draft" : "published",
                  validFrom: selected.valid_from,
                  validTo: selected.valid_to,
                })
              }
            >
              {selected.status === "published" ? "Unpublish" : "Publish"}
            </Button>
          </div>
          <MenuSections menuId={selected.id} />
        </div>
      )}
    </div>
  );
}

function MenuSections({ menuId }: { menuId: string }) {
  const sections = useAdminMenuSections(menuId);
  const saveSection = useSaveMenuSection();
  const [sectionName, setSectionName] = React.useState("");

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!sectionName.trim()) return;
          saveSection.mutate(
            { id: null, menuId, name: sectionName, position: sections.data?.length ?? 0 },
            { onSuccess: () => setSectionName("") },
          );
        }}
      >
        <Field label="New section" htmlFor="section-name">
          <Input
            id="section-name"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
          />
        </Field>
        <Button type="submit" size="sm" variant="secondary" loading={saveSection.isPending}>
          Add section
        </Button>
      </form>

      {sections.data && sections.data.length === 0 && (
        <StatePanel title="No sections yet." description="Add one above." />
      )}

      {(sections.data ?? []).map(
        (section) =>
          section.id && (
            <MenuItems key={section.id} sectionId={section.id} sectionName={section.name ?? ""} />
          ),
      )}
    </div>
  );
}

function MenuItems({ sectionId, sectionName }: { sectionId: string; sectionName: string }) {
  const items = useAdminMenuItems(sectionId);
  const saveItem = useSaveMenuItem();
  const [itemName, setItemName] = React.useState("");
  const [priceInput, setPriceInput] = React.useState("");

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <span className="text-sm font-medium">{sectionName}</span>
      <ul className="flex flex-col gap-1">
        {(items.data ?? []).map((item) => (
          <li key={item.id} className="flex items-center justify-between text-sm">
            <span>{item.name}</span>
            <div className="flex items-center gap-2">
              {item.price_cents != null && (
                <span className="text-muted-foreground">{formatCents(item.price_cents)}</span>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                loading={saveItem.isPending}
                onClick={() =>
                  item.id &&
                  saveItem.mutate({
                    id: item.id,
                    sectionId,
                    name: item.name ?? "",
                    description: item.description,
                    priceCents: item.price_cents,
                    dietary: Array.isArray(item.dietary) ? (item.dietary as string[]) : [],
                    available: !item.available,
                    position: item.position ?? 0,
                  })
                }
              >
                {item.available ? "Hide" : "Show"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!itemName.trim()) return;
          saveItem.mutate(
            {
              id: null,
              sectionId,
              name: itemName,
              description: null,
              priceCents: priceInput ? Math.round(Number(priceInput) * 100) : null,
              dietary: [],
              available: true,
              position: items.data?.length ?? 0,
            },
            {
              onSuccess: () => {
                setItemName("");
                setPriceInput("");
              },
            },
          );
        }}
      >
        <Input
          aria-label="Item name"
          placeholder="Item name"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />
        <Input
          aria-label="Price"
          placeholder="Price"
          type="number"
          step="0.01"
          className="w-28"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
        />
        <Button type="submit" size="sm" variant="ghost" loading={saveItem.isPending}>
          Add item
        </Button>
      </form>
    </div>
  );
}
