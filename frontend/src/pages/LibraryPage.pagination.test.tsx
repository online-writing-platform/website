import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MemoryRouter } from "react-router-dom";

import LibraryPage from "./LibraryPage";

const { requestMock } = vi.hoisted(() => ({
    requestMock: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
    default: () => ({
        request: requestMock,
    }),
}));

vi.mock("../components/StoryCard", () => ({
    default: ({
        story,
    }: {
        story: {
            title: string;
        };
    }) => <div>{story.title}</div>,
}));

function story(id: string, title: string) {
    return {
        id,

        slug: `story-${id}`,

        title,

        description: "Test description",

        coverUrl: null,

        status: "ONGOING",

        isMature: false,

        author: {
            username: "writer",

            displayName: "Writer",
        },
    };
}

function renderPage(): void {
    render(
        <MemoryRouter>
            <LibraryPage />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    requestMock.mockReset();

    requestMock.mockImplementation((path: string) => {
        if (
            path.startsWith("/api/v1/library?") &&
            path.includes("cursor=library-cursor-30")
        ) {
            return Promise.resolve({
                data: {
                    entries: [
                        {
                            addedAt: "2026-08-19T02:00:00.000Z",

                            story: story("library-31", "کتابخانه صفحه دوم"),
                        },
                    ],

                    pagination: {
                        hasMore: false,

                        nextCursor: null,
                    },
                },
            });
        }

        if (path === "/api/v1/library?limit=30") {
            return Promise.resolve({
                data: {
                    entries: [
                        {
                            addedAt: "2026-08-19T01:00:00.000Z",

                            story: story("library-1", "کتابخانه صفحه اول"),
                        },
                    ],

                    pagination: {
                        hasMore: true,

                        nextCursor: "library-cursor-30",
                    },
                },
            });
        }

        if (
            path.startsWith("/api/v1/reading-progress?") &&
            path.includes("cursor=progress-cursor-30")
        ) {
            return Promise.resolve({
                data: {
                    items: [
                        {
                            progress: 0.7,

                            lastReadAt: "2026-08-19T02:00:00.000Z",

                            chapter: {
                                id: "chapter-progress-31",

                                title: "فصل صفحه دوم",
                            },

                            story: story(
                                "progress-31",
                                "ادامه مطالعه صفحه دوم",
                            ),
                        },
                    ],

                    pagination: {
                        hasMore: false,

                        nextCursor: null,
                    },
                },
            });
        }

        if (path === "/api/v1/reading-progress?limit=30") {
            return Promise.resolve({
                data: {
                    items: [
                        {
                            progress: 0.4,

                            lastReadAt: "2026-08-19T01:00:00.000Z",

                            chapter: {
                                id: "chapter-progress-1",

                                title: "فصل صفحه اول",
                            },

                            story: story("progress-1", "ادامه مطالعه صفحه اول"),
                        },
                    ],

                    pagination: {
                        hasMore: true,

                        nextCursor: "progress-cursor-30",
                    },
                },
            });
        }

        if (
            path.startsWith("/api/v1/analytics/history?") &&
            path.includes("cursor=history-cursor-20")
        ) {
            return Promise.resolve({
                data: {
                    items: [
                        {
                            lastReadAt: "2026-08-19T02:00:00.000Z",

                            chapter: {
                                id: "history-chapter-21",

                                title: "تاریخچه فصل دوم",
                            },

                            story: {
                                id: "history-21",

                                slug: "history-story-21",

                                title: "تاریخچه صفحه دوم",

                                coverUrl: null,

                                isMature: false,

                                author: {
                                    username: "writer",

                                    displayName: "Writer",
                                },
                            },
                        },
                    ],

                    pagination: {
                        hasMore: false,

                        nextCursor: null,
                    },
                },
            });
        }

        if (path === "/api/v1/analytics/history?limit=20") {
            return Promise.resolve({
                data: {
                    items: [
                        {
                            lastReadAt: "2026-08-19T01:00:00.000Z",

                            chapter: {
                                id: "history-chapter-1",

                                title: "تاریخچه فصل اول",
                            },

                            story: {
                                id: "history-1",

                                slug: "history-story-1",

                                title: "تاریخچه صفحه اول",

                                coverUrl: null,

                                isMature: false,

                                author: {
                                    username: "writer",

                                    displayName: "Writer",
                                },
                            },
                        },
                    ],

                    pagination: {
                        hasMore: true,

                        nextCursor: "history-cursor-20",
                    },
                },
            });
        }

        if (path === "/api/v1/reading-lists") {
            return Promise.resolve({
                data: {
                    lists: [],
                },
            });
        }

        throw new Error(`Unexpected request: ${path}`);
    });
});

afterEach(() => {
    cleanup();
});

describe("LibraryPage cursor pagination", () => {
    it("allows loading the next Library page when nextCursor is returned", async () => {
        renderPage();

        expect(await screen.findByText("کتابخانه صفحه اول")).toBeTruthy();

        const loadMore = await screen.findByRole("button", {
            name: "نمایش بیشتر ذخیره‌شده‌ها",
        });

        fireEvent.click(loadMore);

        await waitFor(() => {
            expect(requestMock).toHaveBeenCalledWith(
                expect.stringContaining("cursor=library-cursor-30"),
            );
        });

        expect(await screen.findByText("کتابخانه صفحه دوم")).toBeTruthy();
    });

    it("allows loading the next Reading Progress page when nextCursor is returned", async () => {
        renderPage();

        expect(await screen.findByText("ادامه مطالعه صفحه اول")).toBeTruthy();

        const loadMore = await screen.findByRole("button", {
            name: "نمایش بیشتر ادامه مطالعه",
        });

        fireEvent.click(loadMore);

        await waitFor(() => {
            expect(requestMock).toHaveBeenCalledWith(
                expect.stringContaining("cursor=progress-cursor-30"),
            );
        });

        expect(await screen.findByText("ادامه مطالعه صفحه دوم")).toBeTruthy();
    });

    it("allows loading the next Reading History page when nextCursor is returned", async () => {
        renderPage();

        expect(await screen.findByText("تاریخچه صفحه اول")).toBeTruthy();

        const loadMore = await screen.findByRole("button", {
            name: "نمایش بیشتر تاریخچه مطالعه",
        });

        fireEvent.click(loadMore);

        await waitFor(() => {
            expect(requestMock).toHaveBeenCalledWith(
                expect.stringContaining("cursor=history-cursor-20"),
            );
        });

        expect(await screen.findByText("تاریخچه صفحه دوم")).toBeTruthy();
    });
});
