import { Badge, Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@paz/ui";
import { useAuthContext } from "@/lib/auth-context";

/**
 * The gated shell's landing page. Deliberately minimal: real admin
 * navigation and dashboards are later-phase work (Build Readiness Review
 * §5.5, §5.1's `modules/<domain>` tree) — this exists to prove the
 * Authentication phase end-to-end (sign in → MFA → gated route → sign out),
 * not to stand in for the admin console.
 */
export function AdminHomePage() {
  const { session, claims, signOut } = useAuthContext();

  return (
    <div className="max-w-standard mx-auto flex min-h-screen flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Signed in</CardTitle>
          <CardDescription>{session?.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {claims?.roles?.length ? (
              claims.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">No roles granted yet.</span>
            )}
          </div>
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => {
              void signOut();
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
