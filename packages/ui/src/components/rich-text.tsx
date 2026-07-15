import * as React from "react";

/**
 * Renderer for the frozen ProseMirror v1 node set (Build Readiness Review
 * D-7, as constrained in the TipTap editor config): paragraph, heading 2–4,
 * blockquote, bullet/ordered lists, horizontal rule, hard break; marks:
 * bold, italic, link. Unknown node types render their children (never
 * crash on content) — a schema-version bump is the sanctioned way to add
 * nodes, and this renderer must keep rendering v1 documents forever.
 */
export interface RichTextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface RichTextNode {
  type?: string;
  text?: string;
  marks?: RichTextMark[];
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
}

function safeHref(raw: unknown): string {
  const href = String(raw ?? "");
  // Only http(s), mailto, and site-relative links; anything else (js:,
  // data:, …) renders inert.
  return /^(https?:\/\/|mailto:|\/)/i.test(href) ? href : "#";
}

function renderText(node: RichTextNode, key: number): React.ReactNode {
  let el: React.ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") {
      el = <strong>{el}</strong>;
    } else if (mark.type === "italic") {
      el = <em>{el}</em>;
    } else if (mark.type === "link") {
      el = (
        <a href={safeHref(mark.attrs?.["href"])} rel="noopener noreferrer">
          {el}
        </a>
      );
    }
  }
  return <React.Fragment key={key}>{el}</React.Fragment>;
}

function renderNode(node: RichTextNode, key: number): React.ReactNode {
  const children = (node.content ?? []).map((child, i) => renderNode(child, i));
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.["level"] ?? 2), 2), 4);
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      return <Tag key={key}>{children}</Tag>;
    }
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    default:
      return <React.Fragment key={key}>{children}</React.Fragment>;
  }
}

export interface RichTextProps {
  doc: RichTextNode | null | undefined;
  className?: string | undefined;
}

export function RichText({ doc, className }: RichTextProps) {
  if (!doc) return null;
  return <div className={className}>{(doc.content ?? []).map((c, i) => renderNode(c, i))}</div>;
}
