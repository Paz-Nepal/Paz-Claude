import * as React from "react";
import { Button, Field, Input, Textarea } from "@paz/ui";
import { toAppError } from "@paz/types";

export type FieldSpec =
  | {
      key: string;
      label: string;
      type: "text" | "textarea" | "number" | "date";
      hint?: string;
      required?: boolean;
      rows?: number;
    }
  | { key: string; label: string; type: "checkbox"; hint?: string }
  | {
      key: string;
      label: string;
      type: "select";
      options: Array<{ value: string; label: string }>;
      hint?: string;
      required?: boolean;
    };

export type Values = Record<string, string | boolean>;

/** Turns whatever a row holds into the string/boolean a form control needs. */
export function toValues(specs: FieldSpec[], row: Record<string, unknown> | null): Values {
  const out: Values = {};
  for (const f of specs) {
    const v = row?.[f.key];
    if (f.type === "checkbox") out[f.key] = Boolean(v);
    else out[f.key] = typeof v === "string" || typeof v === "number" ? String(v) : "";
  }
  return out;
}

const selectClass =
  "border-input bg-background text-foreground h-10 w-full rounded-lg border px-3 py-2 text-base";

/**
 * A small form driven by a list of field specs, so every Wall, Sattal and
 * Chronicle screen is the same few lines rather than its own bespoke form.
 * Values are always strings and booleans; the caller converts on submit.
 */
export function RecordForm({
  specs,
  initial,
  submitLabel,
  onSubmit,
  pending,
  error,
  resetKey,
  children,
}: {
  specs: FieldSpec[];
  initial: Values;
  submitLabel: string;
  onSubmit: (values: Values) => void;
  pending?: boolean;
  error?: unknown;
  /** Changing this re-initialises the form (switching between rows). */
  resetKey: string;
  children?: React.ReactNode;
}) {
  const [values, setValues] = React.useState<Values>(initial);
  React.useEffect(() => setValues(initial), [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: string, v: string | boolean) => setValues((prev) => ({ ...prev, [key]: v }));
  const missing = specs.some(
    (f) => "required" in f && f.required && String(values[f.key] ?? "").trim() === "",
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!missing) onSubmit(values);
      }}
    >
      {specs.map((f) => {
        const id = `f-${resetKey}-${f.key}`;
        if (f.type === "checkbox") {
          return (
            <div key={f.key} className="flex flex-col gap-1">
              <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
                <input
                  id={id}
                  type="checkbox"
                  checked={Boolean(values[f.key])}
                  onChange={(e) => set(f.key, e.target.checked)}
                />
                {f.label}
              </label>
              {f.hint && <p className="text-muted-foreground text-sm">{f.hint}</p>}
            </div>
          );
        }
        return (
          <Field key={f.key} label={f.label} htmlFor={id} hint={f.hint}>
            {f.type === "textarea" ? (
              <Textarea
                id={id}
                rows={f.rows ?? 4}
                value={String(values[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
              />
            ) : f.type === "select" ? (
              <select
                id={id}
                className={selectClass}
                value={String(values[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
              >
                {!f.required && <option value="">None</option>}
                {f.required && String(values[f.key] ?? "") === "" && (
                  <option value="">Choose</option>
                )}
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={id}
                type={f.type}
                value={String(values[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </Field>
        );
      })}
      {children}
      {error != null && (
        <p role="alert" aria-live="assertive" className="text-destructive text-sm">
          {toAppError(error).message}
        </p>
      )}
      <Button type="submit" loading={Boolean(pending)} disabled={missing} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}

/** "" -> null, otherwise the trimmed string. */
export const s = (v: string | boolean | undefined): string | null => {
  const t = String(v ?? "").trim();
  return t === "" ? null : t;
};

/** "" -> null, otherwise an integer. */
export const n = (v: string | boolean | undefined): number | null => {
  const t = String(v ?? "").trim();
  return t === "" ? null : Math.round(Number(t));
};

/** Whole rupees typed by staff to minor units (paisa). */
export const money = (v: string | boolean | undefined): number | null => {
  const t = String(v ?? "").trim();
  return t === "" ? null : Math.round(Number(t) * 100);
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
