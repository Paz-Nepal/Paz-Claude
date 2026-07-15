import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RichText, type RichTextNode } from "./rich-text";

const doc: RichTextNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Section" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Plain " },
        { type: "text", text: "strong", marks: [{ type: "bold" }] },
        {
          type: "text",
          text: "site",
          marks: [{ type: "link", attrs: { href: "https://example.org" } }],
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }],
        },
      ],
    },
  ],
};

describe("RichText", () => {
  it("renders the frozen v1 node set to semantic HTML", () => {
    render(<RichText doc={doc} />);
    expect(screen.getByRole("heading", { level: 2, name: "Section" })).toBeInTheDocument();
    expect(screen.getByText("strong").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "site" })).toHaveAttribute(
      "href",
      "https://example.org",
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("one");
  });

  it("clamps heading levels into the 2–4 range", () => {
    render(
      <RichText
        doc={{
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Clamped" }] },
          ],
        }}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Clamped" })).toBeInTheDocument();
  });

  it("neutralizes unsafe link protocols", () => {
    render(
      <RichText
        doc={{
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "bad",
                  // eslint-disable-next-line no-script-url
                  marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
                },
              ],
            },
          ],
        }}
      />,
    );
    expect(screen.getByRole("link", { name: "bad" })).toHaveAttribute("href", "#");
  });

  it("renders children of unknown node types instead of crashing", () => {
    render(
      <RichText
        doc={{
          type: "doc",
          content: [
            {
              type: "figure",
              content: [{ type: "paragraph", content: [{ type: "text", text: "caption" }] }],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("caption")).toBeInTheDocument();
  });
});
