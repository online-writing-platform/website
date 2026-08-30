import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions/placeholder";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import {
  useEffect,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

import {
  getChapterEditorHtml,
  MAX_CHAPTER_TEXT_LENGTH,
  serializeChapterEditorHtml,
} from "../lib/chapter-content";
import type { StoryDirection, SupportedStoryLanguage } from "../lib/story-language";

import "./RichTextEditor.css";

interface RichTextEditorProps {
  direction: StoryDirection;
  id: string;
  label: string;
  language?: SupportedStoryLanguage;
  onChange: (value: string) => void;
  onCharacterCountChange?: (characterCount: number) => void;
  onWordCountChange?: (wordCount: number) => void;
  placeholder?: string;
  value: string;
}

interface ToolbarButtonProps
  extends Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "disabled" | "onClick"
  > {
  active?: boolean;
  children: ReactNode;
  label: string;
}

const EMPTY_TOOLBAR_STATE = {
  alignment: "start",
  blockType: "paragraph",
  canRedo: false,
  canUndo: false,
  isBold: false,
  isBulletList: false,
  isItalic: false,
  isLink: false,
  isOrderedList: false,
  isStrike: false,
  isUnderline: false,
} as const;

const COPY = {
  fa: {
    toolbar: "ابزارهای قالب‌بندی متن",
    paragraph: "متن معمولی",
    heading2: "عنوان بخش",
    heading3: "زیرعنوان",
    undo: "واگرد",
    redo: "انجام دوباره",
    bold: "پررنگ",
    italic: "مورب",
    underline: "زیرخط",
    strike: "خط‌خورده",
    bulletList: "فهرست نشانه‌دار",
    orderedList: "فهرست شماره‌دار",
    quote: "نقل‌قول",
    link: "افزودن پیوند",
    unlink: "حذف پیوند",
    clear: "پاک‌کردن قالب‌بندی",
    alignLeft: "تراز چپ",
    alignCenter: "تراز وسط",
    alignRight: "تراز راست",
    alignJustify: "تراز دوطرفه",
    linkPrompt: "نشانی پیوند را وارد کنید:",
    invalidLink: "نشانی پیوند معتبر نیست.",
  },
  en: {
    toolbar: "Text formatting tools",
    paragraph: "Paragraph",
    heading2: "Section heading",
    heading3: "Subheading",
    undo: "Undo",
    redo: "Redo",
    bold: "Bold",
    italic: "Italic",
    underline: "Underline",
    strike: "Strikethrough",
    bulletList: "Bullet list",
    orderedList: "Numbered list",
    quote: "Block quote",
    link: "Add link",
    unlink: "Remove link",
    clear: "Clear formatting",
    alignLeft: "Align left",
    alignCenter: "Align center",
    alignRight: "Align right",
    alignJustify: "Justify",
    linkPrompt: "Enter the link URL:",
    invalidLink: "The link URL is not valid.",
  },
} as const;

function ToolbarButton({
  active,
  children,
  disabled,
  label,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      className="rich-text-editor__tool"
      type="button"
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function getWordCount(editor: Editor): number {
  const text = editor.getText({ blockSeparator: " " }).trim();

  return text ? text.split(/\s+/u).length : 0;
}

function getCharacterCount(editor: Editor): number {
  return editor.storage.characterCount.characters();
}

function normalizeLink(value: string): string | null {
  const link = value.trim();

  if (!link) {
    return "";
  }

  if (link.startsWith("#") || (link.startsWith("/") && !link.startsWith("//"))) {
    return link;
  }

  if (/^(?:https?:\/\/|mailto:)/iu.test(link)) {
    return link;
  }

  if (/^[a-z][a-z\d+.-]*:/iu.test(link)) {
    return null;
  }

  return `https://${link}`;
}

export default function RichTextEditor({
  direction,
  id,
  label,
  language,
  onChange,
  onCharacterCountChange,
  onWordCountChange,
  placeholder = "",
  value,
}: RichTextEditorProps) {
  const { i18n } = useTranslation();
  const copy = i18n.resolvedLanguage?.startsWith("en") ? COPY.en : COPY.fa;

  const editor = useEditor({
    content: getChapterEditorHtml(value),
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        link: {
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
          openOnClick: false,
        },
      }),
      TextAlign.configure({
        alignments: ["left", "center", "right", "justify"],
        types: ["heading", "paragraph"],
      }),
      CharacterCount.configure({
        limit: MAX_CHAPTER_TEXT_LENGTH,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    editorProps: {
      attributes: {
        "aria-label": label,
        "aria-multiline": "true",
        class: "rich-text-editor__content",
        dir: direction,
        id,
        ...(language ? { lang: language } : {}),
        role: "textbox",
        spellcheck: "true",
      },
    },
    immediatelyRender: true,
    textDirection: direction,
    onCreate: ({ editor: createdEditor }) => {
      onCharacterCountChange?.(getCharacterCount(createdEditor));
      onWordCountChange?.(getWordCount(createdEditor));
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onChange(serializeChapterEditorHtml(updatedEditor.getHTML()));
      onCharacterCountChange?.(getCharacterCount(updatedEditor));
      onWordCountChange?.(getWordCount(updatedEditor));
    },
  }, [direction, language, placeholder]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextHtml = getChapterEditorHtml(value);

    if (editor.getHTML() === nextHtml) {
      return;
    }

    const currentSerializedContent = serializeChapterEditorHtml(
      editor.getHTML(),
    );

    if (currentSerializedContent === value) {
      return;
    }

    editor.commands.setContent(nextHtml, {
      emitUpdate: false,
    });

    onCharacterCountChange?.(getCharacterCount(editor));
    onWordCountChange?.(getWordCount(editor));
  }, [editor, onCharacterCountChange, onWordCountChange, value]);

  const selectedToolbarState = useEditorState({
    editor,
    selector: ({ editor: selectedEditor }) => {
      if (!selectedEditor) {
        return EMPTY_TOOLBAR_STATE;
      }

      const alignment = ["left", "center", "right", "justify"].find(
        (value) => selectedEditor.isActive({ textAlign: value }),
      );

      return {
        alignment: alignment ?? "start",
        blockType: selectedEditor.isActive("heading", { level: 2 })
          ? "heading2"
          : selectedEditor.isActive("heading", { level: 3 })
            ? "heading3"
            : "paragraph",
        canRedo: selectedEditor.can().chain().redo().run(),
        canUndo: selectedEditor.can().chain().undo().run(),
        isBold: selectedEditor.isActive("bold"),
        isBulletList: selectedEditor.isActive("bulletList"),
        isItalic: selectedEditor.isActive("italic"),
        isLink: selectedEditor.isActive("link"),
        isOrderedList: selectedEditor.isActive("orderedList"),
        isStrike: selectedEditor.isActive("strike"),
        isUnderline: selectedEditor.isActive("underline"),
      };
    },
  });

  const toolbarState = selectedToolbarState ?? EMPTY_TOOLBAR_STATE;

  function editLink(): void {
    if (!editor) {
      return;
    }

    const currentHref = editor.getAttributes("link").href as
      | string
      | undefined;

    const enteredLink = window.prompt(copy.linkPrompt, currentHref ?? "https://");

    if (enteredLink === null) {
      return;
    }

    const href = normalizeLink(enteredLink);

    if (href === null) {
      window.alert(copy.invalidLink);
      return;
    }

    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href })
      .run();
  }

  return (
    <div className="rich-text-editor">
      <div
        className="rich-text-editor__toolbar"
        role="toolbar"
        aria-controls={id}
        aria-label={copy.toolbar}
        dir={i18n.dir()}
      >
        <div className="rich-text-editor__tool-group">
          <ToolbarButton
            disabled={!editor || !toolbarState.canUndo}
            label={copy.undo}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton
            disabled={!editor || !toolbarState.canRedo}
            label={copy.redo}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 aria-hidden="true" />
          </ToolbarButton>
        </div>

        <div className="rich-text-editor__tool-group">
          <select
            className="rich-text-editor__block-select"
            disabled={!editor}
            aria-label={copy.paragraph}
            value={toolbarState.blockType}
            onChange={(event) => {
              if (!editor) {
                return;
              }

              if (event.target.value === "heading2") {
                editor.chain().focus().setHeading({ level: 2 }).run();
              } else if (event.target.value === "heading3") {
                editor.chain().focus().setHeading({ level: 3 }).run();
              } else {
                editor.chain().focus().setParagraph().run();
              }
            }}
          >
            <option value="paragraph">{copy.paragraph}</option>
            <option value="heading2">{copy.heading2}</option>
            <option value="heading3">{copy.heading3}</option>
          </select>
        </div>

        <div className="rich-text-editor__tool-group">
          <ToolbarButton
            active={toolbarState.isBold}
            disabled={!editor}
            label={copy.bold}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton
            active={toolbarState.isItalic}
            disabled={!editor}
            label={copy.italic}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton
            active={toolbarState.isUnderline}
            disabled={!editor}
            label={copy.underline}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <Underline aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton
            active={toolbarState.isStrike}
            disabled={!editor}
            label={copy.strike}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough aria-hidden="true" />
          </ToolbarButton>
        </div>

        <div className="rich-text-editor__tool-group">
          <ToolbarButton
            active={toolbarState.isBulletList}
            disabled={!editor}
            label={copy.bulletList}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton
            active={toolbarState.isOrderedList}
            disabled={!editor}
            label={copy.orderedList}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton
            disabled={!editor}
            label={copy.quote}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote aria-hidden="true" />
          </ToolbarButton>
        </div>

        <div className="rich-text-editor__tool-group">
          <ToolbarButton
            active={toolbarState.alignment === "left"}
            disabled={!editor}
            label={copy.alignLeft}
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton
            active={toolbarState.alignment === "center"}
            disabled={!editor}
            label={copy.alignCenter}
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton
            active={toolbarState.alignment === "right"}
            disabled={!editor}
            label={copy.alignRight}
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton
            active={toolbarState.alignment === "justify"}
            disabled={!editor}
            label={copy.alignJustify}
            onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustify aria-hidden="true" />
          </ToolbarButton>
        </div>

        <div className="rich-text-editor__tool-group">
          <ToolbarButton
            active={toolbarState.isLink}
            disabled={!editor}
            label={copy.link}
            onClick={editLink}
          >
            <LinkIcon aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton
            disabled={!editor || !toolbarState.isLink}
            label={copy.unlink}
            onClick={() =>
              editor?.chain().focus().extendMarkRange("link").unsetLink().run()
            }
          >
            <Unlink aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton
            disabled={!editor}
            label={copy.clear}
            onClick={() =>
              editor?.chain().focus().unsetAllMarks().clearNodes().run()
            }
          >
            <RemoveFormatting aria-hidden="true" />
          </ToolbarButton>
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
