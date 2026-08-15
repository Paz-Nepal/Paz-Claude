import { describe, expect, it } from "vitest";
import type { RichTextNode } from "@paz/ui";
import { diffBlocks, flattenBlocks } from "./revision-diff";

function paragraph(text: string): RichTextNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

describe("flattenBlocks", () => {
  it("returns one block per top-level node", () => {
    const doc: RichTextNode = {
      type: "doc",
      content: [paragraph("first"), paragraph("second")],
    };
    expect(flattenBlocks(doc)).toEqual([
      { type: "paragraph", text: "first" },
      { type: "paragraph", text: "second" },
    ]);
  });

  it("flattens list items to one block each", () => {
    const doc: RichTextNode = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [paragraph("a")] },
            { type: "listItem", content: [paragraph("b")] },
          ],
        },
      ],
    };
    expect(flattenBlocks(doc)).toEqual([
      { type: "bulletListItem", text: "a" },
      { type: "bulletListItem", text: "b" },
    ]);
  });

  it("returns an empty array for a null/empty doc", () => {
    expect(flattenBlocks(null)).toEqual([]);
    expect(flattenBlocks({ type: "doc", content: [] })).toEqual([]);
  });
});

describe("diffBlocks", () => {
  it("marks everything as added when there is no previous version", () => {
    const after = flattenBlocks({ type: "doc", content: [paragraph("hello")] });
    expect(diffBlocks([], after)).toEqual([
      { op: "add", block: { type: "paragraph", text: "hello" } },
    ]);
  });

  it("marks unchanged blocks as equal", () => {
    const before = flattenBlocks({ type: "doc", content: [paragraph("same")] });
    const after = flattenBlocks({ type: "doc", content: [paragraph("same")] });
    expect(diffBlocks(before, after)).toEqual([
      { op: "equal", block: { type: "paragraph", text: "same" } },
    ]);
  });

  it("shows an edited paragraph as a remove followed by an add", () => {
    const before = flattenBlocks({ type: "doc", content: [paragraph("old text")] });
    const after = flattenBlocks({ type: "doc", content: [paragraph("new text")] });
    expect(diffBlocks(before, after)).toEqual([
      { op: "remove", block: { type: "paragraph", text: "old text" } },
      { op: "add", block: { type: "paragraph", text: "new text" } },
    ]);
  });

  it("keeps unrelated unchanged paragraphs equal around an insertion", () => {
    const before = flattenBlocks({
      type: "doc",
      content: [paragraph("intro"), paragraph("outro")],
    });
    const after = flattenBlocks({
      type: "doc",
      content: [paragraph("intro"), paragraph("middle"), paragraph("outro")],
    });
    expect(diffBlocks(before, after)).toEqual([
      { op: "equal", block: { type: "paragraph", text: "intro" } },
      { op: "add", block: { type: "paragraph", text: "middle" } },
      { op: "equal", block: { type: "paragraph", text: "outro" } },
    ]);
  });
});
