import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@paz/ui";
import { toAppError } from "@paz/types";
import { formatKathmanduTime } from "@paz/utils";
import { supabase } from "@/lib/supabase";

/**
 * Whether what staff publish is reaching the public site. Publishing needs no
 * build and no upload: the site writes its own pages about half a minute after
 * a change. This shows the last time it did, whether that worked, and a button
 * to ask again if something looks stale.
 */
export function SitePublishingPanel() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["site-publishing-status"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("api")
        .from("site_publishing_status")
        .select("*")
        .maybeSingle();
      if (error) throw toAppError(error);
      return data;
    },
  });
  const request = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.schema("api").rpc("request_site_render");
      if (error) throw toAppError(error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["site-publishing-status"] }),
  });

  const s = status.data;
  let line = "Checking…";
  if (status.isError) line = "Could not read the publishing status.";
  else if (s === null) line = "Only people who can read settings see this.";
  else if (s) {
    if (!s.connected)
      line =
        "Not connected yet: the site's page writer has no address (see docs/runbooks/publish-instantly.md).";
    else if (s.running_since) line = "Publishing now…";
    else if (s.dirty) line = "A change is waiting. It goes out within about half a minute.";
    else if (s.last_ok === false)
      line = `The last attempt failed and will be retried: ${s.last_message ?? ""}`;
    else if (s.last_finished_at)
      line = `Up to date. Last published ${formatKathmanduTime(s.last_finished_at)}. ${s.last_message ?? ""}`;
  }

  return (
    <section
      aria-labelledby="site-publishing"
      className="flex flex-col gap-2 rounded-lg border p-4"
    >
      <h2 id="site-publishing" className="font-medium">
        Publishing to the site
      </h2>
      <p role="status" className="text-sm">
        {line}
      </p>
      <p className="text-muted-foreground text-sm">
        Anything you publish or change in the desk goes live by itself. Nothing needs to be built or
        uploaded.
      </p>
      {request.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(request.error).message}
        </p>
      )}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="self-start"
        loading={request.isPending}
        onClick={() => request.mutate()}
      >
        Publish everything again now
      </Button>
    </section>
  );
}
