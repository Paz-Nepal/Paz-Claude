import * as React from "react";
import { Button, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { mediaPublicUrl, useMediaLibrary, useUploadMedia } from "../api/use-publishing";

export interface MediaPickerProps {
  selectedId: string | null;
  selectedPath: string | null;
  onSelect: (mediaId: string | null, storagePath: string | null) => void;
}

/**
 * Featured-image picker: shows the current selection, the library grid, and
 * an upload control. Deliberately inline (no dialog) — the design system
 * has no modal primitive yet, and the editor page has the room.
 */
export function MediaPicker({ selectedId, selectedPath, onSelect }: MediaPickerProps) {
  const [open, setOpen] = React.useState(false);
  const library = useMediaLibrary();
  const upload = useUploadMedia();
  const fileInput = React.useRef<HTMLInputElement>(null);

  const onFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const alt = window.prompt("Describe this image (alt text, required):");
    if (!alt) return;
    upload.mutate(
      { file, alt, credit: null },
      { onSuccess: (result) => onSelect(result.id, result.storagePath) },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {selectedPath ? (
        <div className="flex items-center gap-3">
          <img
            src={mediaPublicUrl(selectedPath)}
            alt=""
            className="h-20 w-28 rounded-md border object-cover"
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => onSelect(null, null)}>
            Remove
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No featured image.</p>
      )}

      <div className="flex gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen((o) => !o)}>
          {open ? "Close library" : "Choose from library"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={upload.isPending}
          onClick={() => fileInput.current?.click()}
        >
          Upload new
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

      {open &&
        (library.data && library.data.length > 0 ? (
          <ul className="grid grid-cols-4 gap-2">
            {library.data.map((media) => (
              <li key={media.id}>
                <button
                  type="button"
                  className={`block w-full overflow-hidden rounded-md border ${
                    media.id === selectedId ? "ring-ring ring-2" : ""
                  }`}
                  onClick={() => {
                    if (media.id) onSelect(media.id, media.storage_path);
                    setOpen(false);
                  }}
                >
                  <img
                    src={media.storage_path ? mediaPublicUrl(media.storage_path) : ""}
                    alt={media.alt ?? ""}
                    className="h-20 w-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <StatePanel
            title="Nothing in the library yet."
            description="Upload an image to get started."
            className="p-6"
          />
        ))}
    </div>
  );
}
