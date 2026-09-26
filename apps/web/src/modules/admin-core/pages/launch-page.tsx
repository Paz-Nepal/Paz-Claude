import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { supabase } from "@/lib/supabase";
import { selectView } from "@/lib/select-view";
import { useSiteInfo } from "@/modules/site";

/**
 * What is unwritten, and what stands between the house and opening. The site
 * is built and waiting; what it lacks is the house's own words and first
 * things. This lists each page and section that is still empty, with a link to
 * fix it, so "blocked on the house" is a short list rather than a feeling.
 * Nothing here writes anything for the house.
 */

type Item = { label: string; hint?: string; done: boolean; to: string; action: string };
type Group = { title: string; intro?: string; items: Item[] };

const PAGES: Array<[slug: string, title: string, hint?: string]> = [
  ["privacy", "Privacy", "What the house keeps about people, and for how long."],
  ["name", "The name", "Why the house is called what it is called."],
  ["table", "The Table", "Described, never offered or booked."],
  ["looking-for", "Looking for", "What the house is looking for."],
  ["commons", "The Commons"],
  ["encounters", "Encounters"],
  ["custodian", "The Custodian of the Name"],
  ["house", "The House", "The organ page."],
  ["hearth", "The Hearth", "The organ page."],
  ["guild", "The Guild", "The organ page."],
  ["treasury", "The Treasury", "The organ page."],
  ["record", "The Record", "The organ page."],
  ["press", "The Press", "The organ page."],
  ["at-the-house", "At the house", "What a visitor may do there. Name only what exists."],
  [
    "finding-the-house",
    "Finding the house",
    "The lane and the gate, in the house's voice. No map from a tracking company.",
  ],
  ["neighbours", "For the neighbours", "Shown Nepali first."],
  [
    "sattal-writing",
    "Writing for the Sattal",
    "The three forms, how to propose, the refusal grounds.",
  ],
  [
    "a-table-elsewhere",
    "A Table kept elsewhere",
    "The meal shared, the welcome given, the remembering done.",
  ],
  [
    "leaving",
    "How to leave",
    "How to unsubscribe, stop being a Friend, have details removed, withdraw an offer.",
  ],
  ["a-voice", "Offering something to the Record"],
  [
    "a-voice-statement",
    "The Record's statement",
    "Who reads offers, that nothing is published, what happens to what is written.",
  ],
  ["struck-row", "The struck row", "The one line under a hallmarked work."],
  ["viewing", "Viewing a work", "By arrangement."],
  ["shipping", "Shipping", "What ships and roughly what it costs."],
  ...Array.from({ length: 7 }, (_, i): [string, string, string?] => [
    `canon-${i + 1}`,
    `The Canon, document ${i + 1}`,
  ]),
];

type CountClient = {
  from: (v: string) => {
    select: (
      c: string,
      o: { count: "exact"; head: true },
    ) => PromiseLike<{ count: number | null; error: unknown }>;
  };
};

async function countOf(view: string): Promise<number | null> {
  const client = supabase.schema("api") as unknown as CountClient;
  const { count, error } = await client.from(view).select("*", { count: "exact", head: true });
  return error ? null : (count ?? 0);
}

function useLaunchData() {
  return useQuery({
    queryKey: ["launch-checklist"],
    queryFn: async () => {
      const [published, ...counts] = await Promise.all([
        selectView<{ type: string | null; slug: string | null }>("published_items", ["slug"]),
        countOf("wall_people"),
        countOf("wall_works"),
        countOf("wall_shows"),
        countOf("house_rooms"),
        countOf("house_things"),
        countOf("chronicle_lines"),
        countOf("hands"),
        countOf("terms_versions"),
        countOf("encounters_calendar"),
        countOf("membership_tiers"),
        countOf("glossary_terms"),
        countOf("sattal_readers"),
        countOf("program_sessions"),
      ]);
      const [
        people,
        works,
        shows,
        rooms,
        things,
        chronicle,
        hands,
        terms,
        encounters,
        tiers,
        words,
        readers,
        sessions,
      ] = counts;
      return {
        pages: new Set(published.filter((p) => p.type === "page").map((p) => p.slug)),
        people,
        works,
        shows,
        rooms,
        things,
        chronicle,
        hands,
        terms,
        encounters,
        tiers,
        words,
        readers,
        sessions,
      };
    },
  });
}

const has = (n: number | null | undefined) => (n ?? 0) > 0;

export function LaunchPage() {
  const data = useLaunchData();
  const info = useSiteInfo();

  const groups = React.useMemo<Group[]>(() => {
    const d = data.data;
    if (!d) return [];
    const pageItems: Item[] = PAGES.map(([slug, title, hint]) => ({
      label: title,
      ...(hint ? { hint } : {}),
      done: d.pages.has(slug),
      to: `/admin/desk/new?type=page&slug=${slug}&title=${encodeURIComponent(title)}`,
      action: "Write it",
    }));
    return [
      {
        title: "Pages only the house can write",
        intro:
          'Each stays a plain "not written yet" until a page with its address is published. Nothing is written in the house\'s place.',
        items: pageItems,
      },
      {
        title: "What should be in the house on opening day",
        items: [
          {
            label: "At least one painter or author on the Wall",
            done: has(d.people),
            to: "/admin/wall/people",
            action: "Add people",
          },
          {
            label: "At least one work, with its photographs",
            done: has(d.works),
            to: "/admin/wall/works",
            action: "Add works",
          },
          {
            label: "The opening show",
            done: has(d.shows),
            to: "/admin/wall/shows",
            action: "Add a show",
          },
          {
            label: "The rooms, described as they are",
            done: has(d.rooms),
            to: "/admin/house/rooms",
            action: "Add rooms",
          },
          {
            label: "The things in them, and where each came from",
            done: has(d.things),
            to: "/admin/house/things",
            action: "Add things",
          },
          {
            label: "The Chronicle begun",
            done: has(d.chronicle),
            to: "/admin/chronicle",
            action: "Add a line",
          },
          {
            label: "The hands published: who holds which role, which seats are open",
            done: has(d.hands),
            to: "/admin/hands",
            action: "Open Hands",
          },
          {
            label: "The terms deposited (painters, writers, memory, friends)",
            done: has(d.terms),
            to: "/admin/desk/new?type=terms",
            action: "Deposit terms",
          },
          {
            label: "The Friends tiers, with names and amounts",
            done: has(d.tiers),
            to: "/admin/tiers",
            action: "Open tiers",
          },
          {
            label: "An outside reader for the Sattal",
            done: has(d.readers),
            to: "/admin/sattal",
            action: "Name a reader",
          },
          {
            label: "The words the house uses",
            done: has(d.words),
            to: "/admin/words",
            action: "Add words",
          },
          {
            label: "What the house is doing in the first months",
            done: has(d.encounters) || has(d.sessions),
            to: "/admin/encounters",
            action: "Add encounters",
          },
        ],
      },
      {
        title: "Setting up",
        items: [
          {
            label: "The site's name",
            done: Boolean(info.data?.["site.name"]),
            to: "/admin/settings",
            action: "Open settings",
          },
          {
            label: "A contact address that is read",
            hint: "Enquiries and the notice that something is waiting go here until a desk address is set.",
            done: Boolean(info.data?.["site.contact_email"]),
            to: "/admin/settings",
            action: "Open settings",
          },
        ],
      },
    ];
  }, [data.data, info.data]);

  const all = groups.flatMap((g) => g.items);
  const done = all.filter((i) => i.done).length;

  return (
    <div className="max-w-standard flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">Before opening</h1>
        <p className="text-muted-foreground">
          What is still unwritten or empty. Ticked items are done; the rest each link to where they
          are fixed.
        </p>
        {data.data && (
          <p role="status" className="text-sm font-medium">
            {done} of {all.length} done.
          </p>
        )}
      </header>

      {data.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}
      {data.isError && (
        <StatePanel
          title="Couldn't load the checklist."
          description={toAppError(data.error).message}
        />
      )}

      {groups.map((g) => (
        <section key={g.title} aria-labelledby={`g-${g.title}`} className="flex flex-col gap-3">
          <h2 id={`g-${g.title}`} className="font-serif text-xl">
            {g.title}
          </h2>
          {g.intro && <p className="text-muted-foreground text-sm">{g.intro}</p>}
          <ul className="flex flex-col divide-y rounded-lg border">
            {g.items.map((i) => (
              <li key={i.label} className="flex items-start justify-between gap-4 p-3">
                <div className="flex flex-col gap-0.5">
                  <span className={i.done ? "text-muted-foreground" : "font-medium"}>
                    <span aria-hidden="true">{i.done ? "✓ " : "○ "}</span>
                    {i.label}
                    <span className="sr-only">{i.done ? " (done)" : " (still to do)"}</span>
                  </span>
                  {i.hint && !i.done && (
                    <span className="text-muted-foreground text-sm">{i.hint}</span>
                  )}
                </div>
                {!i.done && (
                  <Link to={i.to} className="shrink-0 text-sm underline">
                    {i.action}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section aria-labelledby="g-outside" className="flex flex-col gap-3">
        <h2 id="g-outside" className="font-serif text-xl">
          Kept outside the system
        </h2>
        <p className="text-muted-foreground text-sm">
          These cannot be seen from here, so they are only listed. They are the ones that let the
          house survive a bad night or a change of hands.
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          <li>
            A second person who can sign in as staff, and a successor named for each credential
            (docs/runbooks/credentials-and-copies.md).
          </li>
          <li>One real backup run and one restore drill (docs/runbooks/disaster-recovery.md).</li>
          <li>The domain decided, before anything is deposited that would be hard to move.</li>
          <li>
            A person named to be told when a safeguarding concern is waiting (Settings,
            notify.concerns_email).
          </li>
        </ul>
      </section>
    </div>
  );
}
