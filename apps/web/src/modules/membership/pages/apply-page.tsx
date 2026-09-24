import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@paz/ui";
import { useWording } from "@/modules/site/wording";
import { ApplicationForm } from "../components/application-form";

export function ApplyPage() {
  const w = useWording();
  return (
    <div className="max-w-standard mx-auto flex flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-serif text-3xl">{w("friends.title")}</h1>
        <p className="text-muted-foreground">{w("friends.intro")}</p>
        {/* Standing Specifications, "The outer ring: Friends of PAZ":
            "Money buys friendship, support, goods and welcome. It never
            buys a rung on the ladder, a governance vote, or a say...
            Friends is patronage only." */}
        <p className="text-muted-foreground text-sm">{w("friends.patronage")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{w("friends.form-title")}</CardTitle>
          <CardDescription>{w("friends.form-note")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationForm />
        </CardContent>
      </Card>
    </div>
  );
}
