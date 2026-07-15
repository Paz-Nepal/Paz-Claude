import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input } from "@paz/ui";
import { toAppError } from "@paz/types";
import { sessionSchema, type SessionInput } from "../schemas";
import { useSaveSession, useVenues } from "../api/use-programs";

export function SessionForm({ programId }: { programId: string }) {
  const venues = useVenues();
  const save = useSaveSession();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SessionInput>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { venueId: "", startsAt: "", endsAt: "", capacity: 20 },
  });

  const onSubmit = handleSubmit((values) => {
    save.mutate(
      {
        id: null,
        programId,
        venueId: values.venueId || null,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        capacity: values.capacity,
      },
      { onSuccess: () => reset() },
    );
  });

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-wrap items-end gap-3" noValidate>
      <Field label="Venue" htmlFor="venueId">
        <select
          id="venueId"
          className="border-input bg-background h-10 rounded-lg border px-3 text-base"
          {...register("venueId")}
        >
          <option value="">No venue</option>
          {(venues.data ?? []).map((v) => (
            <option key={v.id} value={v.id ?? ""}>
              {v.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Starts" htmlFor="startsAt" error={errors.startsAt?.message}>
        <Input id="startsAt" type="datetime-local" {...register("startsAt")} />
      </Field>
      <Field label="Ends" htmlFor="endsAt" error={errors.endsAt?.message}>
        <Input id="endsAt" type="datetime-local" {...register("endsAt")} />
      </Field>
      <Field label="Capacity" htmlFor="capacity" error={errors.capacity?.message}>
        <Input id="capacity" type="number" min="1" className="w-24" {...register("capacity")} />
      </Field>
      <Button type="submit" loading={save.isPending}>
        Add session
      </Button>
      {save.isError && (
        <p role="alert" className="text-destructive w-full text-sm">
          {toAppError(save.error).message}
        </p>
      )}
    </form>
  );
}
