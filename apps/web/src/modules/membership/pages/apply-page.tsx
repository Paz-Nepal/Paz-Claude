import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@paz/ui";
import { ApplicationForm } from "../components/application-form";

export function ApplyPage() {
  return (
    <div className="max-w-standard mx-auto flex flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-serif text-3xl">Become a Friend</h1>
        <p className="text-muted-foreground">
          Being a Friend of PAZ supports the public programme and comes with a few things back: see
          the tiers below.
        </p>
        {/* Standing Specifications, "The outer ring: Friends of PAZ":
            "Money buys friendship, support, goods and welcome. It never
            buys a rung on the ladder, a governance vote, or a say...
            Friends is patronage only." */}
        <p className="text-muted-foreground text-sm">
          Friends of PAZ is patronage. It buys support and welcome, never a vote or a say in how PAZ
          is run.
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
