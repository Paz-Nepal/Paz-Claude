import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Textarea, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduTime } from "@paz/utils";
import { programSchema, type ProgramInput } from "../schemas";
import { useAdminPrograms, useAdminSessions, useSaveProgram } from "../api/use-programs";
import { SessionForm } from "../components/session-form";

export function ProgramEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const programs = useAdminPrograms();
  const sessions = useAdminSessions(id);

  const existing = id ? programs.data?.find((p) => p.id === id) : undefined;

  if (id && programs.isPending) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-standard flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <Link to="/admin/programmes" className="text-muted-foreground text-sm hover:underline">
          ← Programmes
        </Link>
        <h1 className="font-serif text-2xl">{existing ? "Edit programme" : "New programme"}</h1>
      </div>

      <ProgramMetadataForm
        existing={existing}
        onSaved={(newId) => {
          if (!id) navigate(`/admin/programmes/${newId}`, { replace: true });
        }}
      />

      {id && (
        <div className="flex flex-col gap-4 border-t pt-6">
          <h2 className="font-serif text-xl">Sessions</h2>
          <SessionForm programId={id} />
          {sessions.isError && (
            <StatePanel
              title="Couldn't load sessions."
              description={toAppError(sessions.error).message}
            />
          )}
          {sessions.data &&
            (sessions.data.length === 0 ? (
              <p className="text-muted-foreground text-sm">No sessions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b">
                      <th className="py-2 pr-4 font-medium">When</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 font-medium">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.data.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <Link
                            to={`/admin/programmes/sessions/${s.id}`}
                            className="hover:underline"
                          >
                            {s.starts_at ? formatKathmanduTime(s.starts_at) : ""}
                          </Link>
                        </td>
                        <td className="text-muted-foreground py-3 pr-4 capitalize">{s.status}</td>
                        <td className="text-muted-foreground py-3">
                          {s.registered_count} / {s.capacity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function ProgramMetadataForm({
  existing,
  onSaved,
}: {
  existing:
    | {
        id: string | null;
        slug: string | null;
        title: string | null;
        summary: string | null;
        member_only: boolean | null;
      }
    | undefined;
  onSaved: (id: string) => void;
}) {
  const save = useSaveProgram();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProgramInput>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      title: existing?.title ?? "",
      slug: existing?.slug ?? "",
      summary: existing?.summary ?? "",
      memberOnly: existing?.member_only ?? false,
    },
  });

  const onSubmit = handleSubmit((values) => {
    save.mutate(
      {
        id: existing?.id ?? null,
        slug: values.slug,
        title: values.title,
        summary: values.summary || null,
        memberOnly: values.memberOnly,
      },
      { onSuccess: (newId) => onSaved(newId) },
    );
  });

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4" noValidate>
      <Field label="Title" htmlFor="title" error={errors.title?.message}>
        <Input id="title" {...register("title")} />
      </Field>
      <Field label="Slug" htmlFor="slug" error={errors.slug?.message}>
        <Input id="slug" {...register("slug")} />
      </Field>
      <Field label="Summary" htmlFor="summary" error={errors.summary?.message}>
        <Textarea id="summary" {...register("summary")} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("memberOnly")} />
        Members only
      </label>
      {save.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(save.error).message}
        </p>
      )}
      <Button type="submit" loading={save.isPending} className="self-start">
        Save
      </Button>
    </form>
  );
}
