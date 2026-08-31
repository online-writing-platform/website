import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RICH_TEXT_CONTENT_PREFIX } from "../lib/chapter-content";

import RichTextEditor from "./RichTextEditor";

if (!Range.prototype.getClientRects) {
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: () => [] as unknown as DOMRectList,
  });
}

if (!Range.prototype.getBoundingClientRect) {
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => new DOMRect(),
  });
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: {
      dir: () => "rtl",
      resolvedLanguage: "fa",
    },
  }),
}));

afterEach(() => {
  cleanup();
});

describe("RichTextEditor", () => {
  it("renders an RTL writing surface and exposes formatting controls", async () => {
    const onCharacterCountChange = vi.fn();
    const onWordCountChange = vi.fn();

    render(
      <RichTextEditor
        id="chapter-content"
        label="متن فصل"
        value="سلام دنیا"
        direction="rtl"
        language="fa"
        onChange={vi.fn()}
        onCharacterCountChange={onCharacterCountChange}
        onWordCountChange={onWordCountChange}
      />,
    );

    const textbox = await screen.findByRole("textbox", { name: "متن فصل" });

    expect(textbox.getAttribute("dir")).toBe("rtl");
    expect(textbox.getAttribute("lang")).toBe("fa");
    expect(textbox.textContent).toBe("سلام دنیا");

    await waitFor(() => {
      expect(onCharacterCountChange).toHaveBeenCalledWith(9);
      expect(onWordCountChange).toHaveBeenCalledWith(2);
    });

    const boldButton = screen.getByRole("button", { name: "پررنگ" });

    fireEvent.click(boldButton);

    await waitFor(() => {
      expect(boldButton.getAttribute("aria-pressed")).toBe("true");
    });
  });

  it("updates the editor when a recovery draft replaces its value", async () => {
    const { rerender } = render(
      <RichTextEditor
        id="chapter-content"
        label="متن فصل"
        value="نسخه سرور"
        direction="rtl"
        language="fa"
        onChange={vi.fn()}
      />,
    );

    rerender(
      <RichTextEditor
        id="chapter-content"
        label="متن فصل"
        value={`${RICH_TEXT_CONTENT_PREFIX}<p>نسخه <strong>بازیابی</strong></p>`}
        direction="rtl"
        language="fa"
        onChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("بازیابی").tagName).toBe("STRONG");
    });
  });

  it("shows a localized placeholder without changing the story direction", async () => {
    render(
      <RichTextEditor
        id="chapter-content"
        label="متن فصل"
        value=""
        direction="ltr"
        language="en"
        placeholder="Start writing this chapter…"
        onChange={vi.fn()}
      />,
    );

    const textbox = await screen.findByRole("textbox", { name: "متن فصل" });
    const placeholder = textbox.querySelector("[data-placeholder]");
    const toolbar = screen.getByRole("toolbar", {
      name: "ابزارهای قالب‌بندی متن",
    });

    expect(textbox.getAttribute("dir")).toBe("ltr");
    expect(textbox.getAttribute("lang")).toBe("en");
    expect(toolbar.getAttribute("dir")).toBe("rtl");
    expect(placeholder?.getAttribute("data-placeholder")).toBe(
      "Start writing this chapter…",
    );
  });
});
