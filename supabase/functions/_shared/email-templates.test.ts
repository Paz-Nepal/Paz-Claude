import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { renderReservationRequested } from "./email-templates.ts";

Deno.test("renderReservationRequested includes the code, name, and party size", () => {
  const content = renderReservationRequested({
    code: "PZ-AB12",
    fullName: "Anjali Shrestha",
    partySize: 4,
    startsAt: "2026-09-01T18:30:00.000Z",
  });

  assertStringIncludes(content.subject, "PZ-AB12");
  assertStringIncludes(content.text, "Anjali Shrestha");
  assertStringIncludes(content.text, "4");
  assertStringIncludes(content.html, "Anjali Shrestha");
});

Deno.test("renderReservationRequested escapes HTML in name and notes", () => {
  const content = renderReservationRequested({
    code: "PZ-XYZ9",
    fullName: "<script>alert(1)</script>",
    partySize: 2,
    startsAt: "2026-09-01T18:30:00.000Z",
    notes: "<img src=x onerror=alert(1)>",
  });

  assertEquals(content.html.includes("<script>"), false);
  assertEquals(content.html.includes("<img "), false);
  assertStringIncludes(content.html, "&lt;script&gt;");
});

Deno.test("renderReservationRequested omits the notes line when there are none", () => {
  const content = renderReservationRequested({
    code: "PZ-NOTE",
    fullName: "Bikash Rai",
    partySize: 2,
    startsAt: "2026-09-01T18:30:00.000Z",
    notes: null,
  });

  assertEquals(content.text.includes("Your note:"), false);
  assertEquals(content.html.includes("Your note:"), false);
});
