import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, StatePanel, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { itemMetadataSchema, slugify, type ItemMetadataInput } from "../schemas";
import { useItem, useSaveItem, type ItemDetail, type ItemType } from "../api/use-publishing";
import { BodyEditor } from "../components/body-editor";
import { StatusBadge } from "../components/status-badge";
import { TransitionButtons } from "../components/transition-buttons";
import { MediaPicker } from "../components/media-picker";

const EMPTY_DOC: RichTextNode = { type: "doc", content: [] };

const TYPE_OPTIONS: Array<{ value: ItemType; label: string }> = [
  { value: "article", label: "Article" },
  { value: "page", label: "Page" },
  { value: "paper", label: "PAZ Paper" },
  { value: "brief", label: "Brief" },
  { value: "dispatch", label: "Dispatch" },
  { value: "pigeon_post", label: "Pigeon Post" },
  { value: "annual", label: "Annual" },
  { value: "event", label: "Event" },
];

export function ItemEditorPage() {
  const { id } = useParams<{ id: string }>();
  const item = useItem(id);

  if (id && item.isPending) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (id && item.isError) {
    return (
      <StatePanel title="Couldn't load this item." description={toAppError(item.error).message} />
    );
  }
  // Key by id so navigating between items remounts the form + editor with
  // fresh initial state instead of reconciling stale internal editor state.
  return <ItemEditorForm key={id ?? "new"} existing={item.data ?? null} />;
}

function ItemEditorForm({ existing }: { existing: ItemDetail | null }) {
  const navigate = useNavigate();
  const saveItem = useSaveItem();

  const bodyRef = React.useRef<RichTextNode>((existing?.body as RichTextNode) ?? EMPTY_DOC);
  const [featuredMediaId, setFeaturedMediaId] = React.useState<string | null>(
    existing?.featured_media ?? null,
  );
  const [featuredMediaPath, setFeaturedMediaPath] = React.useState<string | null>(
    existing?.featured_media_path ?? null,
  );
  const [slugTouched, setSlugTouched] = React.useState(Boolean(existing));

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ItemMetadataInput>({
    resolver: zodResolver(itemMetadataSchema),
    defaultValues: {
      type: existing?.type ?? "article",
      title: existing?.title ?? "",
      slug: existing?.slug ?? "",
      subtitle: existing?.subtitle ?? "",
      summary: existing?.summary ?? "",
      tags: (existing?.tags ?? []).join(", "),
    },
  });

  const onSubmit = handleSubmit((values) => {
    saveItem.mutate(
      {
        id: existing?.id ?? null,
        type: values.type,
        slug: values.slug,
        title: values.title,
        subtitle: values.subtitle || null,
        summary: values.summary || null,
        body: bodyRef.current,
        featuredMedia: featuredMediaId,
        tags: values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      },
      {
        onSuccess: (itemId) => {
          if (!existing) navigate(`/admin/desk/${itemId}`, { replace: true });
        },
      },
    );
  });

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/desk" className="text-muted-foreground text-sm hover:underline">
            ← Desk
          </Link>
          <h1 className="font-serif text-2xl">{existing ? "Edit item" : "New item"}</h1>
          {existing?.status && <StatusBadge status={existing.status} />}
        </div>
        <Button type="submit" loading={saveItem.isPending}>
          Save
        </Button>
      </div>

      {saveItem.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(saveItem.error).message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Field label="Title" htmlFor="title" error={errors.title?.message}>
            <Input
              id="title"
              aria-invalid={Boolean(errors.title)}
              {...register("title", {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  if (!slugTouched) setValue("slug", slugify(e.target.value));
                },
              })}
            />
          </Field>
          <Field label="Subtitle" htmlFor="subtitle" error={errors.subtitle?.message}>
            <Input id="subtitle" {...register("subtitle")} />
          </Field>
          <Field
            label="Summary"
            htmlFor="summary"
            hint="Shown in listings and search results."
            error={errors.summary?.message}
          >
            <Input id="summary" {...register("summary")} />
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Body</span>
            <BodyEditor
              initialContent={bodyRef.current}
              onChange={(doc) => {
                bodyRef.current = doc;
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Type" htmlFor="type">
            <select
              id="type"
              className="border-input bg-background flex h-10 w-full rounded-lg border px-3 py-2 text-base"
              disabled={Boolean(existing)}
              {...register("type")}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Slug"
            htmlFor="slug"
            hint="URL path segment. Changing it after publication breaks links."
            error={errors.slug?.message}
          >
            <Input
              id="slug"
              aria-invalid={Boolean(errors.slug)}
              {...register("slug", { onChange: () => setSlugTouched(true) })}
            />
          </Field>
          <Field label="Tags" htmlFor="tags" hint="Comma separated." error={errors.tags?.message}>
            <Input id="tags" {...register("tags")} />
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Featured image</span>
            <MediaPicker
              selectedId={featuredMediaId}
              selectedPath={featuredMediaPath}
              onSelect={(mediaId, storagePath) => {
                setFeaturedMediaId(mediaId);
                setFeaturedMediaPath(storagePath);
              }}
            />
          </div>

          {existing?.id && existing.status && (
            <div className="flex flex-col gap-1.5 border-t pt-4">
              <span className="text-sm font-medium">Workflow</span>
              <TransitionButtons itemId={existing.id} status={existing.status} />
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
