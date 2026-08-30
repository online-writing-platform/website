import sanitizeHtml from "sanitize-html";

export const RICH_TEXT_CONTENT_PREFIX =
    "<!--writing-platform-rich-text:v1-->";

export const MAX_CHAPTER_TEXT_LENGTH = 100_000;
export const MAX_CHAPTER_CONTENT_LENGTH = 500_000;

const BLOCK_BOUNDARY_PATTERN =
    /<\/(?:p|h2|h3|li|blockquote|ul|ol)>|<br\s*\/?>|<hr\s*\/?>/giu;

const ENTITY_PATTERN = /&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/giu;

export interface PreparedChapterContent {
    content: string;
    plainText: string;
    richText: boolean;
}

function isAllowedLinkHref(value: string): boolean {
    const href = value.trim();

    if (
        href.startsWith("#") ||
        (href.startsWith("/") && !href.startsWith("//"))
    ) {
        return true;
    }

    try {
        const url = new URL(href);

        return ["http:", "https:", "mailto:"].includes(url.protocol);
    } catch {
        return false;
    }
}

function decodeTextEntities(value: string): string {
    return value
        .replaceAll("&nbsp;", " ")
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replace(/&#(\d+);/gu, (match, decimal: string) => {
            const codePoint = Number.parseInt(decimal, 10);

            return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
                ? String.fromCodePoint(codePoint)
                : match;
        })
        .replace(/&#x([\da-f]+);/giu, (match, hexadecimal: string) => {
            const codePoint = Number.parseInt(hexadecimal, 16);

            return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
                ? String.fromCodePoint(codePoint)
                : match;
        })
        .replace(ENTITY_PATTERN, " ");
}

export function isRichTextChapterContent(content: string): boolean {
    return content.startsWith(RICH_TEXT_CONTENT_PREFIX);
}

export function sanitizeChapterHtml(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: [
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
        ],
        allowedAttributes: {
            a: ["href", "title", "target", "rel"],
            p: ["style"],
            h2: ["style"],
            h3: ["style"],
        },
        allowedStyles: {
            "*": {
                "text-align": [
                    /^(?:left|right|center|justify|start|end)$/u,
                ],
            },
        },
        allowedSchemes: ["http", "https", "mailto"],
        allowProtocolRelative: false,
        transformTags: {
            a: (_tagName, attributes) => {
                if (
                    !attributes.href ||
                    !isAllowedLinkHref(attributes.href)
                ) {
                    return {
                        tagName: "span",
                        attribs: {},
                    };
                }

                return {
                    tagName: "a",
                    attribs: {
                        href: attributes.href,
                        ...(attributes.title
                            ? { title: attributes.title }
                            : {}),
                        target: "_blank",
                        rel: "noopener noreferrer nofollow",
                    },
                };
            },
        },
    }).trim();
}

export function chapterHtmlToPlainText(html: string): string {
    const separatedBlocks = html.replace(BLOCK_BOUNDARY_PATTERN, " ");

    const withoutTags = sanitizeHtml(separatedBlocks, {
        allowedTags: [],
        allowedAttributes: {},
    });

    return decodeTextEntities(withoutTags).replace(/\s+/gu, " ").trim();
}

export function prepareChapterContent(
    content: string,
): PreparedChapterContent {
    if (!isRichTextChapterContent(content)) {
        return {
            content,
            plainText: content,
            richText: false,
        };
    }

    const html = content.slice(RICH_TEXT_CONTENT_PREFIX.length);
    const sanitizedHtml = sanitizeChapterHtml(html);

    return {
        content: `${RICH_TEXT_CONTENT_PREFIX}${sanitizedHtml}`,
        plainText: chapterHtmlToPlainText(sanitizedHtml),
        richText: true,
    };
}
