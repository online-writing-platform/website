import { cleanup, render, screen } from "@testing-library/react";

import { MemoryRouter, Route, Routes } from "react-router-dom";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChapterResponse, StoryResponse } from "../types/story";

import ReaderPage from "./ReaderPage";

const { authenticatedRequestMock, anonymousRequestMock } = vi.hoisted(() => ({
    authenticatedRequestMock: vi.fn(),
    anonymousRequestMock: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
    default: () => ({
        status: "authenticated",
        request: authenticatedRequestMock,

        user: {
            id: "adult-user-1",
            username: "adult-reader",
            displayName: "کاربر بزرگسال",
        },
    }),
}));

vi.mock("../lib/api", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../lib/api")>();

    return {
        ...actual,
        apiRequest: anonymousRequestMock,
    };
});

vi.mock("../hooks/useDocumentMeta", () => ({
    useDocumentMeta: vi.fn(),
}));

vi.mock("../components/ReaderInteractions", () => ({
    default: () => null,
}));

afterEach(() => {
    cleanup();
});

const matureStoryResponse: StoryResponse = {
    data: {
        story: {
            id: "story-1",

            slug: "mature-story",

            title: "داستان بزرگسال",

            description: "یک داستان Mature برای تست Reader.",

            coverUrl: null,

            language: "fa",

            rights: "ALL_RIGHTS_RESERVED",

            status: "ONGOING",

            visibility: "PUBLIC",

            moderationState: "VISIBLE",

            isMature: true,

            publishedAt: "2026-08-17T05:00:00.000Z",

            createdAt: "2026-08-17T04:00:00.000Z",

            updatedAt: "2026-08-17T05:00:00.000Z",

            author: {
                username: "writer",
                displayName: "نویسنده",
                avatarUrl: null,
            },

            genre: null,

            tags: [],

            chapters: [
                {
                    id: "chapter-1",

                    title: "فصل اول",

                    position: 1,

                    version: 1,

                    status: "PUBLISHED",

                    moderationState: "VISIBLE",

                    wordCount: 5,

                    publishedAt: "2026-08-17T05:00:00.000Z",

                    createdAt: "2026-08-17T04:00:00.000Z",

                    updatedAt: "2026-08-17T05:00:00.000Z",
                },
            ],
        },
    },
};

const chapterResponse: ChapterResponse = {
    data: {
        chapter: {
            id: "chapter-1",

            title: "فصل اول",

            position: 1,

            content: "این متن فصل Mature است.",

            version: 1,

            status: "PUBLISHED",

            moderationState: "VISIBLE",

            wordCount: 5,

            publishedAt: "2026-08-17T05:00:00.000Z",

            createdAt: "2026-08-17T04:00:00.000Z",

            updatedAt: "2026-08-17T05:00:00.000Z",
        },
    },
};

describe("ReaderPage mature content authentication", () => {
    beforeEach(() => {
        authenticatedRequestMock.mockReset();
        anonymousRequestMock.mockReset();

        anonymousRequestMock.mockRejectedValue(
            new Error("Mature story is not available to an anonymous viewer."),
        );

        authenticatedRequestMock.mockImplementation(
            (path: string, options: RequestInit = {}) => {
                if (
                    path === "/api/v1/stories/mature-story" &&
                    (options.method === undefined || options.method === "GET")
                ) {
                    return Promise.resolve(matureStoryResponse);
                }

                if (
                    path ===
                        "/api/v1/stories/mature-story/chapters/chapter-1" &&
                    (options.method === undefined || options.method === "GET")
                ) {
                    return Promise.resolve(chapterResponse);
                }

                if (path === "/api/v1/preferences") {
                    return Promise.resolve({
                        data: {
                            preferences: {
                                readerTheme: "SYSTEM",

                                fontScale: 1,

                                lineHeight: 1.75,
                            },
                        },
                    });
                }

                if (
                    path === "/api/v1/analytics/reads" &&
                    options.method === "POST"
                ) {
                    return Promise.resolve(undefined);
                }

                if (
                    path === "/api/v1/reading-progress" &&
                    options.method === "PUT"
                ) {
                    return Promise.resolve(undefined);
                }

                throw new Error(
                    `Unexpected authenticated request: ${
                        options.method ?? "GET"
                    } ${path}`,
                );
            },
        );
    });

    it("loads both story metadata and chapter through the authenticated request path for a logged-in mature-content viewer", async () => {
        render(
            <MemoryRouter
                initialEntries={["/stories/mature-story/chapters/chapter-1"]}
            >
                <Routes>
                    <Route
                        path="/stories/:slug/chapters/:chapterId"
                        element={<ReaderPage />}
                    />
                </Routes>
            </MemoryRouter>,
        );

        expect(
            await screen.findByRole("heading", {
                name: "فصل اول",
            }),
        ).toBeTruthy();

        expect(authenticatedRequestMock).toHaveBeenCalledWith(
            "/api/v1/stories/mature-story",
        );

        expect(authenticatedRequestMock).toHaveBeenCalledWith(
            "/api/v1/stories/mature-story/chapters/chapter-1",
        );

        expect(anonymousRequestMock).not.toHaveBeenCalled();

        expect(screen.getByText("این متن فصل Mature است.")).toBeTruthy();
    });
});
