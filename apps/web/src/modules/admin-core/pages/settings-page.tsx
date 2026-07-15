import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Field, Input, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { supabase } from "@/lib/supabase";

interface SettingRow {
  key: string;
  value: unknown;
  description: string | null;
}

function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("api")
        .from("settings")
        .select("*")
        .order("key");
      if (error) throw toAppError(error);
      return data as SettingRow[];
    },
  });
}

function displayValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return JSON.stringify(value ?? "");
}

function SettingEditor({ setting }: { setting: SettingRow }) {
  const queryClient = useQueryClient();
  const isNumber = typeof setting.value === "number";
  const [draft, setDraft] = React.useState(displayValue(setting.value));

  const save = useMutation({
    mutationFn: async () => {
      const value = isNumber ? Number(draft) : draft;
      if (isNumber && Number.isNaN(value)) {
        throw new Error("Enter a number");
      }
      const { error } = await supabase
        .schema("api")
        .rpc("update_setting", { p_key: setting.key, p_value: value });
      if (error) throw toAppError(error);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  const inputId = `setting-${setting.key.replace(/\./g, "-")}`;

  return (
    <div className="flex items-end gap-2 border-b py-4 last:border-0">
      <Field
        label={setting.key}
        htmlFor={inputId}
        hint={setting.description ?? undefined}
        error={save.isError ? toAppError(save.error).message : undefined}
        className="flex-1"
      >
        <Input
          id={inputId}
          type={isNumber ? "number" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </Field>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={save.isPending}
        onClick={() => save.mutate()}
      >
        Save
      </Button>
    </div>
  );
}

export function SettingsPage() {
  const settings = useSettings();

  return (
    <div className="max-w-standard flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Institutional settings</h1>
      {settings.isPending && <p className="text-muted-foreground">Loading…</p>}
      {settings.isError && (
        <StatePanel
          title="Couldn't load settings."
          description={toAppError(settings.error).message}
        />
      )}
      {settings.data && (
        <div>
          {settings.data.map((setting) => (
            <SettingEditor key={setting.key} setting={setting} />
          ))}
        </div>
      )}
    </div>
  );
}
