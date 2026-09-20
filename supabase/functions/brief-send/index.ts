// Sends a deposited Brief to the confirmed list. Staff only: the caller's
// JWT must carry the mail.manage permission (checked through the api, not
// trusted from the client). One list, the same letter to everyone, no
// segmentation of any kind. An issue can only be sent once: api.brief_begin_send
// writes the guard row before any mail goes, and a second send is refused.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/send-email.ts";

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Flattens the frozen ProseMirror node set to plain text. */
// deno-lint-ignore no-explicit-any
function bodyText(doc: any): string {
  const parts: string[] = [];
  // deno-lint-ignore no-explicit-any
  const walk = (node: any) => {
    if (!node) return;
    if (node.type === "text") parts.push(node.text ?? "");
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child);
      if (node.type === "paragraph" || node.type === "heading") parts.push("\n\n");
    }
  };
  walk(doc);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  const auth = req.headers.get("Authorization");
  if (!auth) return jsonError("Sign in required", 401);

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  if (!body.slug) return jsonError("Choose a Brief", 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  // The caller's own session: permission is decided by the database.
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: perms, error: permError } = await asCaller.schema("api").rpc("my_permissions");
  if (permError || !(perms as string[] | null)?.includes("mail.manage")) {
    return jsonError("Not permitted", 403);
  }

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const api = admin.schema("api");

  // Published items are readable by any session, so the caller's own client
  // reads the Brief. A Brief that has not been deposited has no address to send.
  const { data: itemData, error: itemError } = await asCaller
    .schema("api")
    .rpc("get_brief", { p_slug: body.slug })
    .maybeSingle();
  const item = itemData as { id: string; title: string; body: unknown; deposit_ref: string | null } | null;
  if (itemError || !item || !item.deposit_ref) {
    return jsonError("That Brief has not been deposited", 400);
  }

  // The guard row goes in before any mail does: a Brief is sent once.
  const { error: beginError } = await api.rpc("brief_begin_send", { p_item: item.id });
  if (beginError) return jsonError("This Brief has already been sent", 409);

  const { data: recipients, error: recError } = await api.rpc("brief_recipients");
  if (recError) return jsonError(recError.message, 500);

  const site = (Deno.env.get("PUBLIC_SITE_URL") ?? "").replace(/\/$/, "");
  const text = bodyText(item.body);
  let count = 0;
  for (const r of (recipients ?? []) as Array<{ email: string; unsubscribe_token: string }>) {
    const unsubscribeUrl = `${site}/brief/unsubscribe?token=${r.unsubscribe_token}`;
    try {
      await sendEmail({
        to: r.email,
        template: {
          name: "brief-issue",
          data: {
            title: item.title,
            body: text,
            readUrl: `${site}/record/${item.deposit_ref}`,
            unsubscribeUrl,
          },
        },
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      count++;
    } catch (err) {
      console.error("brief-send: one message failed", err);
    }
  }

  await api.rpc("brief_record_send", { p_item: item.id, p_count: count });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
