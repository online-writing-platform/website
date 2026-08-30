import assert from "node:assert/strict";
import test from "node:test";

import {
    chapterHtmlToPlainText,
    prepareChapterContent,
    RICH_TEXT_CONTENT_PREFIX,
    sanitizeChapterHtml,
} from "./chapter-content.js";

void test("legacy plain-text chapters remain byte-for-byte compatible", () => {
    const content = "خط اول\n\nخط دوم <نمونه>";

    assert.deepEqual(prepareChapterContent(content), {
        content,
        plainText: content,
        richText: false,
    });
});

void test("rich-text chapters keep supported formatting and remove unsafe markup", () => {
    const content = `${RICH_TEXT_CONTENT_PREFIX}<h2 onclick="evil()">عنوان</h2>
        <p style="text-align:center;color:red">سلام <strong>دنیا</strong></p>
        <script>alert(1)</script>
        <a href="javascript:alert(1)">ناامن</a>
        <a href="https://example.com">امن</a>`;

    const prepared = prepareChapterContent(content);

    assert.equal(prepared.richText, true);
    assert.match(prepared.content, /<h2>عنوان<\/h2>/u);
    assert.match(prepared.content, /<strong>دنیا<\/strong>/u);
    assert.match(prepared.content, /style="text-align:center"/u);
    assert.match(prepared.content, /href="https:\/\/example\.com"/u);
    assert.match(prepared.content, /rel="noopener noreferrer nofollow"/u);
    assert.doesNotMatch(prepared.content, /script|onclick|javascript|color:/iu);
    assert.match(prepared.content, /<span>ناامن<\/span>/u);
});

void test("plain-text extraction preserves block boundaries and decodes entities", () => {
    const html =
        "<p>سلام&nbsp;<strong>دنیا</strong></p><p>A &amp; B<br>C</p>";

    assert.equal(chapterHtmlToPlainText(html), "سلام دنیا A & B C");
});

void test("sanitizer only permits text-alignment styles", () => {
    const sanitized = sanitizeChapterHtml(
        '<p style="text-align:right;background:url(https://evil.invalid/x)">متن</p>',
    );

    assert.equal(sanitized, '<p style="text-align:right">متن</p>');
});
