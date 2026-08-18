import { cleanup, render, screen } from "@testing-library/react";

import { MemoryRouter } from "react-router-dom";

import { afterEach, describe, expect, it, vi } from "vitest";

import NotificationsPage from "./NotificationsPage";

const { requestMock } = vi.hoisted(() => ({
    requestMock: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
    default: () => ({
        request: requestMock,
    }),
}));

afterEach(() => {
    cleanup();

    requestMock.mockReset();
});

describe("NotificationsPage story publication", () => {
    it("renders STORY_PUBLISHED as a story publication notification", async () => {
        requestMock.mockResolvedValue({
            data: {
                items: [
                    {
                        id: "notification-1",

                        type: "STORY_PUBLISHED",

                        data: {
                            storyId: "story-1",

                            storyTitle: "داستان آزمایشی",
                        },

                        readAt: null,

                        createdAt: "2026-08-18T08:00:00.000Z",

                        actor: {
                            username: "writer",

                            displayName: "نویسنده",

                            avatarUrl: null,
                        },
                    },
                ],

                hasMore: false,

                nextCursor: null,
            },
        });

        render(
            <MemoryRouter>
                <NotificationsPage />
            </MemoryRouter>,
        );

        expect(
            await screen.findByText("داستان «داستان آزمایشی» منتشر شد."),
        ).toBeTruthy();

        expect(screen.queryByText("فصل تازه‌ای منتشر شد.")).toBeNull();

        expect(screen.queryByText("اعلان جدید")).toBeNull();
    });
});
