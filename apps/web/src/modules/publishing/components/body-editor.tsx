import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Button, type RichTextNode } from "@paz/ui";

/**
 * TipTap editor constrained to the frozen v1 node set (D-7): paragraph,
 * heading 2–4, blockquote, lists, horizontal rule; marks bold/italic/link.
 * Code, strike, and code blocks are disabled — adding any node type back
 * requires a body_schema_version bump and renderer support first.
 */
const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    code: false,
    codeBlock: false,
    strike: false,
  }),
  Link.configure({ openOnClick: false }),
];

function ToolbarButton({
  editor,
  label,
  active,
  onClick,
}: {
  editor: Editor;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "primary" : "ghost"}
      onClick={onClick}
      disabled={!editor.isEditable}
    >
      {label}
    </Button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = (editor.getAttributes("link")["href"] as string | undefined) ?? "";
    // window.prompt is deliberate v1 minimalism: it works, it's accessible,
    // and it avoids building a popover system before the design system has
    // one. Replace alongside the figure/embed nodes.
    const url = window.prompt("Link URL (leave empty to remove)", previous);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex flex-wrap gap-1 border-b p-2" role="toolbar" aria-label="Formatting">
      <ToolbarButton
        editor={editor}
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        editor={editor}
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        editor={editor}
        label="Link"
        active={editor.isActive("link")}
        onClick={setLink}
      />
      {([2, 3, 4] as const).map((level) => (
        <ToolbarButton
          key={level}
          editor={editor}
          label={`H${level}`}
          active={editor.isActive("heading", { level })}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
        />
      ))}
      <ToolbarButton
        editor={editor}
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        editor={editor}
        label="• List"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        editor={editor}
        label="1. List"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        editor={editor}
        label="Rule"
        active={false}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />
    </div>
  );
}

export interface BodyEditorProps {
  /** Initial document; the editor owns state afterwards (report via onChange). */
  initialContent: RichTextNode;
  onChange: (doc: RichTextNode) => void;
}

export function BodyEditor({ initialContent, onChange }: BodyEditorProps) {
  const editor = useEditor({
    extensions,
    content: initialContent,
    editorProps: {
      attributes: {
        class: "rich-text min-h-[320px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
  });

  React.useEffect(() => () => editor?.destroy(), [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
