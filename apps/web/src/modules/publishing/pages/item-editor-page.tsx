import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, StatePanel, type RichTextNode } from "@paz/ui";
import { toAppError } from "@paz/types";
import { itemMetadataSchema, slugify, type ItemMetadataInput } from "../schemas";
import {
  useItem,
  useSaveItem,
  useDiscardDraft,
  type ItemDetail,
  type ItemType,
} from "../api/use-publishing";
import { BodyEditor } from "../components/body-editor";
import { StatusBadge } from "../components/status-badge";
import { TransitionButtons } from "../components/transition-buttons";
import { MediaPicker } from "../components/media-picker";
import { SeriesDetailsPanel, type SeriesDetails } from "../components/series-details-panel";

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
  const discardDraft = useDiscardDraft();

  const bodyRef = React.useRef<RichTextNode>((existing?.body as RichTextNode) ?? EMPTY_DOC);
  const bodyNeRef = React.useRef<RichTextNode>((existing?.body_ne as RichTextNode) ?? EMPTY_DOC);
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
    watch,
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
      titleNe: existing?.title_ne ?? "",
      subtitleNe: existing?.subtitle_ne ?? "",
      summaryNe: existing?.summary_ne ?? "",
      tags: (existing?.tags ?? []).join(", "),
    },
  });

  const selectedType = watch("type");

  const onSubmit = handleSubmit((values) => {
    saveItem.mutate(
      {
        id: existing?.id ?? null,
        type: values.type,
        slug: values.slug,
        title: values.title,
        titleNe: values.titleNe || null,
        subtitle: values.subtitle || null,
        subtitleNe: values.subtitleNe || null,
        summary: values.summary || null,
        summaryNe: values.summaryNe || null,
        body: bodyRef.current,
        bodyNe: bodyNeRef.current,
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
        <div className="flex items-center gap-2">
          {existing?.id && existing.status === "draft" && (
            <Button
              type="button"
              variant="ghost"
              loading={discardDraft.isPending}
              onClick={() => {
                if (window.confirm("Discard this draft? This cannot be undone.")) {
                  discardDraft.mutate(existing.id, {
                    onSuccess: () => navigate("/admin/desk"),
                  });
                }
              }}
            >
              Discard draft
            </Button>
          )}
          <Button type="submit" loading={saveItem.isPending}>
            Save
          </Button>
        </div>
      </div>

      {saveItem.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(saveItem.error).message}
        </p>
      )}
      {discardDraft.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(discardDraft.error).message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title (English)" htmlFor="title" error={errors.title?.message}>
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
            <Field label="Title (Nepali)" htmlFor="title-ne" error={errors.titleNe?.message}>
              <Input id="title-ne" lang="ne" {...register("titleNe")} />
            </Field>
            <Field label="Subtitle (English)" htmlFor="subtitle" error={errors.subtitle?.message}>
              <Input id="subtitle" {...register("subtitle")} />
            </Field>
            <Field
              label="Subtitle (Nepali)"
              htmlFor="subtitle-ne"
              error={errors.subtitleNe?.message}
            >
              <Input id="subtitle-ne" lang="ne" {...register("subtitleNe")} />
            </Field>
            <Field
              label="Summary (English)"
              htmlFor="summary"
              hint="Shown in listings and search results."
              error={errors.summary?.message}
            >
              <Input id="summary" {...register("summary")} />
            </Field>
            <Field label="Summary (Nepali)" htmlFor="summary-ne" error={errors.summaryNe?.message}>
              <Input id="summary-ne" lang="ne" {...register("summaryNe")} />
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Body (English)</span>
            <BodyEditor
              initialContent={bodyRef.current}
              onChange={(doc) => {
                bodyRef.current = doc;
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Body (Nepali) — optional</span>
            <BodyEditor
              initialContent={bodyNeRef.current}
              onChange={(doc) => {
                bodyNeRef.current = doc;
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

          {existing?.id && (
            <SeriesDetailsPanel
              type={selectedType}
              itemId={existing.id}
              details={existing.details as SeriesDetails | null}
            />
          )}
          {!existing?.id && selectedType !== "article" && selectedType !== "page" && (
            <p className="text-muted-foreground border-t pt-4 text-sm">
              Save this item first to fill in its{" "}
              {TYPE_OPTIONS.find((o) => o.value === selectedType)?.label}
              -specific details.
            </p>
          )}

          {existing?.id && existing.status && (
            <div className="flex flex-col gap-1.5 border-t pt-4">
              <span className="text-sm font-medium">Workflow</span>
              <TransitionButtons
                itemId={existing.id}
                status={existing.status}
                type={existing.type}
              />
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
