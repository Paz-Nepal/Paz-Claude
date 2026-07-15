import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@paz/ui";
import { MfaEnrollForm } from "../components/mfa-enroll-form";

export function MfaEnrollPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set up multi-factor authentication</CardTitle>
          <CardDescription>Required for all staff accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <MfaEnrollForm />
        </CardContent>
      </Card>
    </div>
  );
}
