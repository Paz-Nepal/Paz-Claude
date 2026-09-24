import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Field, Input, StatePanel, Textarea } from "@paz/ui";
import { toAppError } from "@paz/types";
import { supabase } from "@/lib/supabase";
import {
  WORDING,
  WORDING_KEYS,
  placeholdersOf,
  useSiteWording,
  type WordingKey,
  type WordingOverride,
} from "@/modules/site/wording";

/**
 * The desk's form for the public site's fixed wording: every menu item,
 * footer line, page intro, house rule, form label and empty-section
 * sentence, in English and Nepali. The defaults are written in the code
 * (apps/web/src/modules/site/wording.json); what is saved here is the
 * house's rewording, and clearing a line returns it to the default.
 *
 * Written for whoever keeps the site next, not for a programmer: each line
 * says where it appears, shows its default, and refuses a save that would
 * break it (a missing {placeholder}, an em dash).
 */

const EM_DASH = String.fromCharCode(8212);

type Filter = "all" | "changed" | "no-nepali";

function problemsWith(key: WordingKey, en: string, ne: string): string | null {
  if (en.includes(EM_DASH) || ne.includes(EM_DASH)) {
    return "An em dash cannot be published. Rewrite the sentence without one.";
  }
  const needed = placeholdersOf(WORDING[key].en);
  for (const [lang, text] of [
    ["English", en],
    ["Nepali", ne],
  ] as const) {
    if (!text.trim()) continue;
    const missing = needed.filter((p) => !text.includes(`{${p}}`));
    if (missing.length > 0) {
      return `The ${lang} must keep ${missing.map((p) => `{${p}}`).join(", ")}. The site fills it in.`;
    }
  }
  return null;
}

function WordingLine({
  wordKey,
  override,
}: {
  wordKey: WordingKey;
  override: WordingOverride | undefined;
}) {
  const entry = WORDING[wordKey];
  const queryClient = useQueryClient();
  const savedEn = override?.en ?? entry.en;
  const savedNe = override?.ne ?? entry.ne ?? "";
  const [en, setEn] = React.useState(savedEn);
  const [ne, setNe] = React.useState(savedNe);
  const [localError, setLocalError] = React.useState<string | null>(null);

  // A save elsewhere (or a reset) refreshes the saved values; keep the boxes in step.
  React.useEffect(() => setEn(savedEn), [savedEn]);
  React.useEffect(() => setNe(savedNe), [savedNe]);

  const save = useMutation({
    mutationFn: async (next: { en: string | null; ne: string | null }) => {
      const { error } = await supabase.schema("api").rpc("save_site_wording", {
        p_key: wordKey,
        p_en: next.en as string,
        p_ne: next.ne as string,
      });
      if (error) throw toAppError(error);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["site-wording"] }),
  });

  const dirty = en !== savedEn || ne !== savedNe;
  const changed = Boolean(override);
  const placeholders = placeholdersOf(entry.en);
  const id = `wording-${wordKey.replace(/\./g, "-")}`;

  const onSave = () => {
    const problem = problemsWith(wordKey, en, ne);
    setLocalError(problem);
    if (problem) return;
    // Only what differs from the default is kept, so a later change to a
    // default in the code still reaches every line the house left alone.
    const enOut = en.trim() && en.trim() !== entry.en ? en.trim() : null;
    const neOut = ne.trim() && ne.trim() !== (entry.ne ?? "") ? ne.trim() : null;
    save.mutate({ en: enOut, ne: neOut });
  };

  const onReset = () => {
    setLocalError(null);
    save.mutate({ en: null, ne: null });
  };

  const error = localError ?? (save.isError ? toAppError(save.error).message : undefined);

  return (
    <li className="flex flex-col gap-3 border-b py-5 last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{entry.label}</p>
        <div className="flex items-center gap-2">
          {changed && <Badge variant="secondary">Changed</Badge>}
          {!savedNe && <Badge variant="outline">No Nepali yet</Badge>}
        </div>
      </div>
      {changed && (
        <p className="text-muted-foreground text-sm">
          Default: <span className="italic">{entry.en}</span>
        </p>
      )}
      {placeholders.length > 0 && (
        <p className="text-muted-foreground text-sm">
          Keep {placeholders.map((p) => `{${p}}`).join(", ")} in the text. The site fills{" "}
          {placeholders.length === 1 ? "it" : "them"} in.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="English" htmlFor={`${id}-en`}>
          <Textarea
            id={`${id}-en`}
            rows={Math.min(6, Math.max(1, Math.ceil(en.length / 60)))}
            value={en}
            onChange={(e) => setEn(e.target.value)}
          />
        </Field>
        <Field
          label="Nepali"
          htmlFor={`${id}-ne`}
          hint="Left empty, Nepali readers see the English."
        >
          <Textarea
            id={`${id}-ne`}
            lang="ne"
            rows={Math.min(6, Math.max(1, Math.ceil(Math.max(ne.length, en.length) / 60)))}
            value={ne}
            onChange={(e) => setNe(e.target.value)}
          />
        </Field>
      </div>
      {error && (
        <p role="alert" aria-live="assertive" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {save.isSuccess && !dirty && !error && (
        <p role="status" className="text-muted-foreground text-sm">
          Saved.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" loading={save.isPending} disabled={!dirty} onClick={onSave}>
          Save
        </Button>
        {dirty && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setEn(savedEn);
              setNe(savedNe);
              setLocalError(null);
            }}
          >
            Undo my typing
          </Button>
        )}
        {changed && (
          <Button type="button" size="sm" variant="secondary" onClick={onReset}>
            Use the default again
          </Button>
        )}
      </div>
    </li>
  );
}

export function WordingPage() {
  const overrides = useSiteWording();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");

  const map = overrides.data;
  const q = query.trim().toLowerCase();

  const visible = WORDING_KEYS.filter((key) => {
    const entry = WORDING[key];
    const o = map?.get(key);
    if (filter === "changed" && !o) return false;
    if (filter === "no-nepali" && (o?.ne ?? entry.ne)) return false;
    if (!q) return true;
    return [entry.label, entry.area, entry.en, entry.ne ?? "", o?.en ?? "", o?.ne ?? "", key]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const areas = [...new Set(WORDING_KEYS.map((k) => WORDING[k].area))];
  const changedCount = map ? WORDING_KEYS.filter((k) => map.has(k)).length : 0;
  const noNepaliCount = WORDING_KEYS.filter((k) => !(map?.get(k)?.ne ?? WORDING[k].ne)).length;

  return (
    <div className="max-w-standard flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl">Wording</h1>
        <p className="text-muted-foreground">
          Every fixed line the public site says: the menus, the footer, page headings and intros,
          the house&rsquo;s standing lines, form labels and buttons, and what an empty section says.
          Change the English or the Nepali and press Save. The live site changes within a few
          minutes. The plain copies of each page change the next time the pages are published.
        </p>
        <p className="text-muted-foreground text-sm">
          Pages the house writes in full (the Canon, Privacy, the organs&rsquo; own pages) are
          written in the Desk, not here.
        </p>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <Field label="Find a line" htmlFor="wording-search" className="flex-1">
          <Input
            id="wording-search"
            type="search"
            value={query}
            placeholder="Words on the page, or where they appear"
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {(
            [
              ["all", `All ${WORDING_KEYS.length}`],
              ["changed", `Changed (${changedCount})`],
              ["no-nepali", `No Nepali yet (${noNepaliCount})`],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={filter === value ? "primary" : "secondary"}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {overrides.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}
      {overrides.isError && (
        <StatePanel
          title="Couldn't load the wording."
          description={toAppError(overrides.error).message}
        />
      )}

      {overrides.isSuccess && visible.length === 0 && (
        <p className="text-muted-foreground">No line matches.</p>
      )}

      {overrides.isSuccess &&
        areas.map((area) => {
          const keys = visible.filter((k) => WORDING[k].area === area);
          if (keys.length === 0) return null;
          const changedHere = keys.filter((k) => map?.has(k)).length;
          return (
            <details key={area} open={Boolean(q) || filter !== "all"} className="border-t pt-4">
              <summary className="cursor-pointer font-serif text-xl">
                {area}{" "}
                <span className="text-muted-foreground font-sans text-sm">
                  {keys.length} {keys.length === 1 ? "line" : "lines"}
                  {changedHere > 0 ? `, ${changedHere} changed` : ""}
                </span>
              </summary>
              <ul className="mt-2">
                {keys.map((key) => (
                  <WordingLine key={key} wordKey={key} override={map?.get(key)} />
                ))}
              </ul>
            </details>
          );
        })}
    </div>
  );
}
