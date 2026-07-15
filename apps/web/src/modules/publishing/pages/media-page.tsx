import * as React from "react";
import { Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduDate } from "@paz/utils";
import { mediaPublicUrl, useMediaLibrary, useUploadMedia } from "../api/use-publishing";

export function MediaPage() {
  const library = useMediaLibrary();
  const upload = useUploadMedia();
  const fileInput = React.useRef<HTMLInputElement>(null);

  const onFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const alt = window.prompt("Describe this image (alt text, required):");
    if (!alt) return;
    const credit = window.prompt("Credit (photographer/source, optional):") || null;
    upload.mutate({ file, alt, credit });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl">Media library</h1>
        <Button type="button" loading={upload.isPending} onClick={() => fileInput.current?.click()}>
          Upload
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={onFileChosen}
        />
      </div>

      {upload.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(upload.error).message}
        </p>
      )}

      {library.isPending && <p className="text-muted-foreground">Loading…</p>}
      {library.isError && (
        <StatePanel
          title="Couldn't load the library."
          description={toAppError(library.error).message}
        />
      )}

      {library.data &&
        (library.data.length === 0 ? (
          <StatePanel
            title="Nothing in the library yet."
            description="Upload the first image to get started."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {library.data.map((media) => (
              <li key={media.id} className="flex flex-col gap-1">
                <img
                  src={media.storage_path ? mediaPublicUrl(media.storage_path) : ""}
                  alt={media.alt ?? ""}
                  className="h-36 w-full rounded-lg border object-cover"
                />
                <p className="truncate text-sm">{media.alt}</p>
                <p className="text-muted-foreground text-xs">
                  {media.created_at ? formatKathmanduDate(media.created_at) : ""}
                  {media.credit ? ` · ${media.credit}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
