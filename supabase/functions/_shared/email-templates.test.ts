import { renderSomethingWaiting } from "./email-templates.ts";

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

Deno.test("a waiting notice says only that something is waiting", () => {
  for (const what of ["concern", "desk"] as const) {
    const mail = renderSomethingWaiting({ what });
    check(mail.subject === "Something is waiting on the desk", "the subject is fixed");
    check(mail.text.includes("Sign in"), "it tells the person to sign in");
    check(mail.text.includes("never contains what was written"), "it says it carries nothing");
    // Nothing that could name a person, a place or a subject.
    const bare = (mail.subject + mail.text).replace("never contains what was written", "");
    check(!/safeguard|child|@/i.test(bare), "it reveals nothing");
  }
});
