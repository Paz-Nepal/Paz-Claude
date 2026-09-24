import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Field, Input, StatePanel, Textarea } from "@paz/ui";
import { toAppError, type Database } from "@paz/types";
import { formatMoney } from "@paz/utils";
import { supabase } from "@/lib/supabase";
import { selectAll } from "@/lib/paged";

/**
 * The Friends of PAZ tiers: name, yearly amount and the line under each,
 * in English and Nepali. Until migration 0080 these could only be changed
 * in the database itself.
 *
 * Friends is patronage (Standing Specifications, "The outer ring"): a tier
 * buys support and welcome, never a rung, a vote or a say. Nothing on this
 * form can make it otherwise; it only changes the words and the amount.
 * A tier people have applied under cannot be deleted, so it is switched
 * off instead, which takes it off the public form and keeps the record.
 */

type TierRow = Database["api"]["Views"]["admin_membership_tiers"]["Row"];

const EM_DASH = String.fromCharCode(8212);

function useAdminTiers() {
  return useQuery({
    queryKey: ["admin-membership-tiers"],
    queryFn: () =>
      selectAll<TierRow>((from, to) =>
        supabase.schema("api").from("admin_membership_tiers").select("*").range(from, to),
      ),
  });
}

type Draft = {
  key: string;
  name: string;
  name_ne: string;
  description: string;
  description_ne: string;
  rupees: string;
  active: boolean;
};

function toDraft(t: TierRow | null): Draft {
  return {
    key: t?.key ?? "",
    name: t?.name ?? "",
    name_ne: t?.name_ne ?? "",
    description: t?.description ?? "",
    description_ne: t?.description_ne ?? "",
    rupees: t?.annual_fee_cents != null ? String(t.annual_fee_cents / 100) : "",
    active: t?.active ?? true,
  };
}

function TierForm({ tier, onDone }: { tier: TierRow | null; onDone?: () => void }) {
  const queryClient = useQueryClient();
  const isNew = tier === null;
  const [d, setD] = React.useState<Draft>(() => toDraft(tier));
  const [localError, setLocalError] = React.useState<string | null>(null);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const id = `tier-${tier?.key ?? "new"}`;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.schema("api").rpc("save_membership_tier", {
        p: {
          key: d.key.trim(),
          name: d.name,
          name_ne: d.name_ne,
          description: d.description,
          description_ne: d.description_ne,
          annual_fee_cents: Math.round(Number(d.rupees) * 100),
          active: d.active,
        },
      });
      if (error) throw toAppError(error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-membership-tiers"] });
      void queryClient.invalidateQueries({ queryKey: ["membership-tiers"] });
      onDone?.();
    },
  });

  const onSave = () => {
    const text = [d.name, d.name_ne, d.description, d.description_ne].join(" ");
    let problem: string | null = null;
    if (!d.name.trim()) problem = "A tier needs a name.";
    else if (d.rupees.trim() === "" || Number.isNaN(Number(d.rupees)) || Number(d.rupees) < 0)
      problem = "Enter the yearly amount in rupees, as a number.";
    else if (isNew && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.key.trim()))
      problem = "Give the new tier a short key: lower case letters, numbers and dashes.";
    else if (text.includes(EM_DASH))
      problem = "An em dash cannot be published. Rewrite the sentence without one.";
    setLocalError(problem);
    if (!problem) save.mutate();
  };

  const error = localError ?? (save.isError ? toAppError(save.error).message : undefined);

  return (
    <div className="flex flex-col gap-4">
      {isNew && (
        <Field
          label="Key"
          htmlFor={`${id}-key`}
          hint="A short name the system uses, never shown to readers. It cannot be changed later."
        >
          <Input id={`${id}-key`} value={d.key} onChange={(e) => set({ key: e.target.value })} />
        </Field>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" htmlFor={`${id}-name`}>
          <Input id={`${id}-name`} value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Name in Nepali" htmlFor={`${id}-name-ne`}>
          <Input
            id={`${id}-name-ne`}
            lang="ne"
            value={d.name_ne}
            onChange={(e) => set({ name_ne: e.target.value })}
          />
        </Field>
        <Field label="The line under it" htmlFor={`${id}-desc`}>
          <Textarea
            id={`${id}-desc`}
            rows={2}
            value={d.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
        <Field label="The line under it, in Nepali" htmlFor={`${id}-desc-ne`}>
          <Textarea
            id={`${id}-desc-ne`}
            lang="ne"
            rows={2}
            value={d.description_ne}
            onChange={(e) => set({ description_ne: e.target.value })}
          />
        </Field>
        <Field
          label="Yearly amount, in rupees"
          htmlFor={`${id}-fee`}
          hint={
            d.rupees && !Number.isNaN(Number(d.rupees))
              ? `Shown as ${formatMoney(Math.round(Number(d.rupees) * 100))} a year.`
              : undefined
          }
        >
          <Input
            id={`${id}-fee`}
            inputMode="decimal"
            value={d.rupees}
            onChange={(e) => set({ rupees: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 self-center text-sm">
          <input
            type="checkbox"
            checked={d.active}
            onChange={(e) => set({ active: e.target.checked })}
          />
          Offered on the Friends form
        </label>
      </div>
      {error && (
        <p role="alert" aria-live="assertive" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {save.isSuccess && !isNew && !error && (
        <p role="status" className="text-muted-foreground text-sm">
          Saved.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" loading={save.isPending} onClick={onSave}>
          {isNew ? "Add the tier" : "Save"}
        </Button>
        {isNew && onDone && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export function AdminTiersPage() {
  const tiers = useAdminTiers();
  const [adding, setAdding] = React.useState(false);

  return (
    <div className="max-w-standard flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl">Friends tiers</h1>
        <p className="text-muted-foreground">
          The tiers on the Friends of PAZ form: what each is called, what it costs a year, and the
          line under it. Friends is patronage. A tier buys support and welcome, never a vote or a
          say in how PAZ is run.
        </p>
        <p className="text-muted-foreground text-sm">
          A tier someone has applied under cannot be removed. Untick &ldquo;Offered on the Friends
          form&rdquo; to stop offering it; the record stays.
        </p>
      </header>

      {tiers.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}
      {tiers.isError && (
        <StatePanel
          title="Couldn't load the tiers."
          description={toAppError(tiers.error).message}
        />
      )}

      <ul className="flex flex-col">
        {(tiers.data ?? []).map((t) => (
          <li key={t.key} className="flex flex-col gap-3 border-t py-6">
            <div className="flex items-baseline gap-3">
              <h2 className="font-serif text-xl">{t.name}</h2>
              {!t.active && <Badge variant="outline">Not offered</Badge>}
            </div>
            <TierForm tier={t} />
          </li>
        ))}
      </ul>

      {adding ? (
        <section className="flex flex-col gap-3 border-t py-6" aria-labelledby="new-tier">
          <h2 id="new-tier" className="font-serif text-xl">
            A new tier
          </h2>
          <TierForm tier={null} onDone={() => setAdding(false)} />
        </section>
      ) : (
        tiers.isSuccess && (
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => setAdding(true)}
          >
            Add a tier
          </Button>
        )
      )}
    </div>
  );
}
