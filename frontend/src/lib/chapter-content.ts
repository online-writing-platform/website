import DOMPurify from "dompurify";

export const RICH_TEXT_CONTENT_PREFIX =
  "<!--writing-platform-rich-text:v1-->";

export const MAX_CHAPTER_TEXT_LENGTH = 100_000;

const ALLOWED_RICH_TEXT_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "a",
  "span",
];

const ALLOWED_TEXT_ALIGNMENTS = new Set([
  "left",
  "right",
  "center",
  "justify",
  "start",
  "end",
]);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function legacyTextToHtml(content: string): string {
  if (!content) {
    return "<p></p>";
  }

  return content
    .split(/\n{2,}/u)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

export function isRichTextChapterContent(content: string): boolean {
  return content.startsWith(RICH_TEXT_CONTENT_PREFIX);
}

export function sanitizeChapterHtml(html: string): string {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ALLOWED_RICH_TEXT_TAGS,
    ALLOWED_ATTR: ["href", "title", "target", "rel", "style"],
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });

  const document = new DOMParser().parseFromString(sanitized, "text/html");

  for (const element of document.body.querySelectorAll<HTMLElement>(
    "[style]",
  )) {
    const textAlign = element.style.textAlign;

    element.removeAttribute("style");

    if (ALLOWED_TEXT_ALIGNMENTS.has(textAlign)) {
      element.style.textAlign = textAlign;
    }
  }

  for (const link of document.body.querySelectorAll<HTMLAnchorElement>("a")) {
    if (!link.hasAttribute("href")) {
      link.removeAttribute("target");
      link.removeAttribute("rel");
      continue;
    }

    link.target = "_blank";
    link.rel = "noopener noreferrer nofollow";
  }

  return document.body.innerHTML;
}

export function getChapterEditorHtml(content: string): string {
  if (!isRichTextChapterContent(content)) {
    return legacyTextToHtml(content);
  }

  return sanitizeChapterHtml(content.slice(RICH_TEXT_CONTENT_PREFIX.length));
}

export function serializeChapterEditorHtml(html: string): string {
  return `${RICH_TEXT_CONTENT_PREFIX}${sanitizeChapterHtml(html)}`;
}

export function getChapterReaderHtml(content: string): string | null {
  if (!isRichTextChapterContent(content)) {
    return null;
  }

  return sanitizeChapterHtml(content.slice(RICH_TEXT_CONTENT_PREFIX.length));
}
