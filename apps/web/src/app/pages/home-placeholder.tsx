import { Card, CardContent, CardHeader, CardTitle } from "@paz/ui";

/**
 * Placeholder only. Per the "no placeholder architecture" rule, this is not
 * standing in for a design decision — the homepage's actual content and
 * layout are Phase 1 work (Publishing & Public Site) and depend on the
 * publishing schema existing first. This page exists solely so Phase 0's
 * routing, providers, and error boundary have something real to render and
 * be tested against.
 */
export function HomePlaceholder() {
  return (
    <div className="max-w-standard mx-auto flex flex-col items-center gap-6 px-6 py-24 text-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>PAZ OS — foundation running</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Application shell, routing, and error handling are wired. Publishing content will replace
          this page in Phase 1.
        </CardContent>
      </Card>
    </div>
  );
}
