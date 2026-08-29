import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import i18n from "../i18n";
import StoryCard from "./StoryCard";

const story = {
  id: "story-1",
  slug: "a-story",
  title: "یک داستان",
  coverUrl: null,
  isMature: false,
  author: {
    username: "writer",
    displayName: "نویسنده",
  },
};
describe("StoryCard", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("fa");
  });

  afterEach(() => {
    cleanup();
  });

  it("links to the stable story slug and exposes author context", () => {
    render(
      <MemoryRouter>
        <StoryCard story={story} />
      </MemoryRouter>,
    );

    expect(
      screen
        .getByRole("link", {
          name: "مشاهده داستان یک داستان",
        })
        .getAttribute("href"),
    ).toBe("/stories/a-story");

    expect(screen.getByText(/نویسنده/u)).toBeTruthy();
  });

  it("labels mature stories", () => {
    render(
      <MemoryRouter>
        {" "}
        <StoryCard
          story={{
            ...story,
            isMature: true,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/۱۸/u)).toBeTruthy();
  });

  it("keeps the original story title and direction", async () => {
    await i18n.changeLanguage("en");

    render(
      <MemoryRouter>
        <StoryCard
          variant="home"
          story={{
            ...story,
            title: "The Untranslated Story",
            language: "en-US",
            libraryCount: 1200,
            voteCount: 75,
            commentCount: 14,
          }}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", {
        name: "The Untranslated Story",
      }),
    ).toBeTruthy();

    expect(screen.getByRole("article").getAttribute("dir")).toBe("ltr");

    expect(
      screen.getByRole("link", {
        name: "View The Untranslated Story",
      }),
    ).toBeTruthy();
  });
});
