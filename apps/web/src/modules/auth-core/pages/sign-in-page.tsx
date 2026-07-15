import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@paz/ui";
import { SignInForm } from "../components/sign-in-form";

export function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Staff and member access to PAZ OS.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
        </CardContent>
      </Card>
    </div>
  );
}
