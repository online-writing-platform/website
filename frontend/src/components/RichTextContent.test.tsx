import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RICH_TEXT_CONTENT_PREFIX } from "../lib/chapter-content";

import RichTextContent from "./RichTextContent";

afterEach(() => {
  cleanup();
});

describe("RichTextContent", () => {
  it("renders formatted chapter content and sanitizes unsafe markup", () => {
    const { container } = render(
      <RichTextContent
        content={`${RICH_TEXT_CONTENT_PREFIX}<p>سلام <strong>دنیا</strong></p><script>alert(1)</script><a href="https://example.com">پیوند</a>`}
      />,
    );

    expect(screen.getByText("دنیا").tagName).toBe("STRONG");
    expect(container.querySelector("script")).toBeNull();

    const link = screen.getByRole("link", { name: "پیوند" });

    expect(link.getAttribute("href")).toBe("https://example.com");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer nofollow");
  });

  it("renders legacy plain text without interpreting HTML", () => {
    const { container } = render(
      <RichTextContent content={'متن <strong id="unsafe">قدیمی</strong>'} />,
    );

    expect(container.querySelector("#unsafe")).toBeNull();
    expect(screen.getByText('متن <strong id="unsafe">قدیمی</strong>')).toBeTruthy();
  });
});
