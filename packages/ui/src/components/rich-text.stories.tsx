import { RichText, type RichTextNode } from "./rich-text";

const doc: RichTextNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "A sample piece" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This paragraph has " },
        { type: "text", text: "bold", marks: [{ type: "bold" }] },
        { type: "text", text: ", " },
        { type: "text", text: "italic", marks: [{ type: "italic" }] },
        { type: "text", text: ", and a " },
        { type: "text", text: "link", marks: [{ type: "link", attrs: { href: "/journal" } }] },
        { type: "text", text: "." },
      ],
    },
    {
      type: "blockquote",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A quoted line, set apart." }] },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "First" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Second" }] }],
        },
      ],
    },
    { type: "horizontalRule" },
    { type: "paragraph", content: [{ type: "text", text: "One last line." }] },
  ],
};

export const Basic = () => <RichText doc={doc} className="rich-text max-w-reading" />;

export const Empty = () => <RichText doc={null} />;

/**
 * ADR-28's "still open" note: the kitchen-sink `doc` above is hand-built
 * to exercise every node type, which isn't the same as proving RichText
 * survives what a real database row actually contains. These four are
 * copied verbatim (not re-typed) from supabase/seed/synthetic.sql's
 * `body` columns -- if that seed data's shape ever drifts from what
 * RichText expects, this story is where it would visibly break first,
 * in the workshop, instead of silently on the public site.
 */
const seedDocs: { source: string; doc: RichTextNode }[] = [
  {
    source: "publishing.items — page/about",
    doc: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "[PLACEHOLDER] About PAZ" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "[PLACEHOLDER] Replace this paragraph with the real About copy through the CMS before this page is meant to be seen by anyone outside local development.",
            },
          ],
        },
      ],
    },
  },
  {
    source: "publishing.items — page/guild",
    doc: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "[PLACEHOLDER] The Guild" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "[PLACEHOLDER] Replace this paragraph with the real Guild copy through the CMS.",
            },
          ],
        },
      ],
    },
  },
  {
    source: "publishing.items — page/treasury",
    doc: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "[PLACEHOLDER] The Treasury" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "[PLACEHOLDER] Replace this paragraph with the real Treasury copy through the CMS.",
            },
          ],
        },
      ],
    },
  },
  {
    source: "publishing.items — article/placeholder-first-piece",
    doc: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "[PLACEHOLDER] A first piece for the Journal" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "[PLACEHOLDER] Replace this with real writing through the CMS. This row exists so the Journal and article-reading journey render something locally.",
            },
          ],
        },
      ],
    },
  },
];

export const SeedData = () => (
  <div className="max-w-reading flex flex-col gap-10">
    {seedDocs.map(({ source, doc: d }) => (
      <div key={source}>
        <p className="text-muted-foreground mb-2 font-mono text-xs">{source}</p>
        <RichText doc={d} className="rich-text" />
      </div>
    ))}
  </div>
);
