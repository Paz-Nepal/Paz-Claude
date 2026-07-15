import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@paz/ui";
import { ApplicationForm } from "../components/application-form";

export function ApplyPage() {
  return (
    <div className="max-w-standard mx-auto flex flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-serif text-3xl">Become a member</h1>
        <p className="text-muted-foreground">
          Membership supports PAZ&rsquo;s public programme and comes with a few things back — see
          the tiers below.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Application</CardTitle>
          <CardDescription>We&rsquo;ll review it and follow up by email.</CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationForm />
        </CardContent>
      </Card>
    </div>
  );
}
