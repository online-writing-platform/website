import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MemoryRouter } from "react-router-dom";

import NotificationsPage from "./NotificationsPage";

const { requestMock } = vi.hoisted(() => ({
    requestMock: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
    default: () => ({
        request: requestMock,
    }),
}));

function notification(id: string, displayName: string) {
    return {
        id,

        type: "FOLLOW",

        data: {},

        readAt: null,

        createdAt: "2026-08-19T04:00:00.000Z",

        actor: {
            username: `user-${id}`,

            displayName,

            avatarUrl: null,
        },
    };
}

beforeEach(() => {
    requestMock.mockReset();

    requestMock.mockImplementation((path: string) => {
        if (path === "/api/v1/notifications?limit=50") {
            return Promise.resolve({
                data: {
                    items: [notification("notification-1", "کاربر صفحه اول")],

                    hasMore: true,

                    nextCursor: "notification-50",
                },
            });
        }

        if (path === "/api/v1/notifications?limit=50&cursor=notification-50") {
            return Promise.resolve({
                data: {
                    items: [notification("notification-51", "کاربر صفحه دوم")],

                    hasMore: false,

                    nextCursor: null,
                },
            });
        }

        throw new Error(`Unexpected request: ${path}`);
    });
});

afterEach(() => {
    cleanup();
});

describe("NotificationsPage cursor pagination", () => {
    it("allows loading notifications after the first 50 when nextCursor is returned", async () => {
        render(
            <MemoryRouter>
                <NotificationsPage />
            </MemoryRouter>,
        );

        expect(
            await screen.findByText("کاربر صفحه اول شما را دنبال کرد."),
        ).toBeTruthy();

        const loadMore = await screen.findByRole("button", {
            name: "نمایش اعلان‌های بیشتر",
        });

        fireEvent.click(loadMore);

        await waitFor(() => {
            expect(requestMock).toHaveBeenCalledWith(
                "/api/v1/notifications?limit=50&cursor=notification-50",
            );
        });

        expect(
            await screen.findByText("کاربر صفحه دوم شما را دنبال کرد."),
        ).toBeTruthy();

        expect(
            screen.getByText("کاربر صفحه اول شما را دنبال کرد."),
        ).toBeTruthy();
    });
});
