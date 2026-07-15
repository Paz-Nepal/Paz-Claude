import { useParams } from "react-router-dom";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { usePrograms, useProgramSessions } from "../api/use-programs";
import { SessionRegisterCard } from "../components/session-register-card";

export function ProgramPage() {
  const { slug } = useParams<{ slug: string }>();
  const programs = usePrograms();
  const sessions = useProgramSessions(slug);

  const program = programs.data?.find((p) => p.slug === slug);

  if (programs.isPending) return <p className="text-muted-foreground p-8">Loading…</p>;
  if (!program) {
    return (
      <div className="p-8">
        <StatePanel
          title="There's nothing at this address."
          description="This programme may have ended or never existed."
        />
      </div>
    );
  }

  return (
    <div className="max-w-standard mx-auto flex flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">{program.title}</h1>
        {program.summary && <p className="text-muted-foreground">{program.summary}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-xl">Upcoming sessions</h2>
        {sessions.isError && (
          <StatePanel
            title="Couldn't load sessions."
            description={toAppError(sessions.error).message}
          />
        )}
        {sessions.data &&
          (sessions.data.length === 0 ? (
            <p className="text-muted-foreground">No sessions scheduled right now.</p>
          ) : (
            sessions.data.map((session) => (
              <SessionRegisterCard key={session.id} session={session} />
            ))
          ))}
      </div>
    </div>
  );
}
