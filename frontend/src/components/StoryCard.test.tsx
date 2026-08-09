import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import StoryCard from "./StoryCard";

const story = {
  id: "story-1",
  slug: "a-story",
  title: "یک داستان",
  coverUrl: null,
  isMature: false,
  author: { username: "writer", displayName: "نویسنده" },
};

describe("StoryCard", () => {
  it("links to the stable story slug and exposes author context", () => {
    render(
      <MemoryRouter>
        <StoryCard story={story} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "مشاهده داستان یک داستان" }).getAttribute("href"),
    ).toBe("/stories/a-story");
    expect(screen.getByText("نویسنده")).toBeTruthy();
  });

  it("labels mature stories without hiding the server-side policy requirement", () => {
    render(
      <MemoryRouter>
        <StoryCard story={{ ...story, isMature: true }} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/۱۸/u)).toBeTruthy();
  });
});
