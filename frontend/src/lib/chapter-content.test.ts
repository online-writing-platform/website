import { describe, expect, it } from "vitest";

import {
  getChapterEditorHtml,
  getChapterReaderHtml,
  RICH_TEXT_CONTENT_PREFIX,
  serializeChapterEditorHtml,
} from "./chapter-content";

describe("chapter rich-text storage", () => {
  it("converts legacy plain text to safe editor HTML", () => {
    const html = getChapterEditorHtml("سلام <script>\nخط بعد\n\nپاراگراف دوم");

    expect(html).toBe(
      "<p>سلام &lt;script&gt;<br>خط بعد</p><p>پاراگراف دوم</p>",
    );
  });

  it("serializes only the supported and safe formatting subset", () => {
    const stored = serializeChapterEditorHtml(
      '<p onclick="evil()" style="text-align:right;color:red">سلام <strong>دنیا</strong></p><script>alert(1)</script><a href="javascript:alert(2)">ناامن</a>',
    );

    expect(stored.startsWith(RICH_TEXT_CONTENT_PREFIX)).toBe(true);
    expect(stored).toContain("<strong>دنیا</strong>");
    expect(stored).toContain('style="text-align: right;"');
    expect(stored).not.toMatch(/onclick|script|javascript|color:/iu);
  });

  it("keeps legacy content out of the HTML rendering path", () => {
    expect(getChapterReaderHtml("<strong>متن قدیمی</strong>")).toBeNull();
  });
});
