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
