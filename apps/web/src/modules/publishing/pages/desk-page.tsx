import * as React from "react";
import { Link } from "react-router-dom";
import { Button, StatePanel } from "@paz/ui";
import { formatKathmanduDate } from "@paz/utils";
import { toAppError } from "@paz/types";
import { useDeskItems, type ItemStatus, type ItemType } from "../api/use-publishing";
import { StatusBadge } from "../components/status-badge";

const STATUS_FILTERS: Array<{ value: ItemStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "in_review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const TYPE_LABEL: Record<ItemType, string> = {
  article: "Article",
  page: "Page",
  paper: "PAZ Paper",
  dispatch: "Dispatch",
  pigeon_post: "Pigeon Post",
};

export function DeskPage() {
  const items = useDeskItems();
  const [status, setStatus] = React.useState<ItemStatus | "all">("all");

  const visible = (items.data ?? []).filter((i) => status === "all" || i.status === status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl">Editorial desk</h1>
        <Button asChild>
          <Link to="/admin/desk/new">New item</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            type="button"
            size="sm"
            variant={status === f.value ? "primary" : "ghost"}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {items.isPending && <p className="text-muted-foreground">Loading…</p>}
      {items.isError && (
        <StatePanel title="Couldn't load the desk." description={toAppError(items.error).message} />
      )}

      {items.data &&
        (visible.length === 0 ? (
          <StatePanel
            title="Nothing here."
            description={
              status === "all"
                ? "Create the first item to get started."
                : "No items with this status."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="py-2 pr-4 font-medium">Title</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Author</th>
                  <th className="py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link to={`/admin/desk/${item.id}`} className="font-medium hover:underline">
                        {item.title}
                      </Link>
                    </td>
                    <td className="text-muted-foreground py-3 pr-4">
                      {item.type ? TYPE_LABEL[item.type] : ""}
                    </td>
                    <td className="py-3 pr-4">
                      {item.status && <StatusBadge status={item.status} />}
                    </td>
                    <td className="text-muted-foreground py-3 pr-4">{item.author_name}</td>
                    <td className="text-muted-foreground py-3">
                      {item.updated_at ? formatKathmanduDate(item.updated_at) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
