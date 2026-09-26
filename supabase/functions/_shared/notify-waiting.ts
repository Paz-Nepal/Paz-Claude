// Tells one person that something is waiting on the desk, so a concern, a
// request to leave, an offer or a voice does not sit unread. The message never
// carries what was written (see renderSomethingWaiting), and a failure here
// never fails the submission it is about: the person who wrote in has already
// been heard, and that must not depend on an email going out.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "./send-email.ts";

/**
 * `service` must be a service-role client (api.notify_address is granted to
 * service_role only). "concern" goes to the one address named for safeguarding
 * and nowhere else; "desk" goes to the desk address, or the site's contact
 * address until one is set.
 */
export async function notifyWaiting(
  service: SupabaseClient,
  kind: "concern" | "desk",
): Promise<void> {
  try {
    const { data: to, error } = await service.schema("api").rpc("notify_address", {
      p_kind: kind,
    });
    if (error) throw new Error(error.message);
    if (typeof to !== "string" || !to.includes("@")) {
      console.error(`notify-waiting: no address is set for "${kind}", so no one was told`);
      return;
    }
    await sendEmail({
      to,
      template: { name: "something-waiting", data: { what: kind } },
      entity: { schema: "admin", table: "notifications", id: null },
    });
  } catch (err) {
    console.error(`notify-waiting: could not tell anyone about a waiting "${kind}"`, err);
  }
}
