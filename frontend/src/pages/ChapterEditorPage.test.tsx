import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Chapter, ChapterResponse } from "../types/story";

import ChapterEditorPage from "./ChapterEditorPage";

const { requestMock } = vi.hoisted(() => ({
    requestMock: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
    default: () => ({
        request: requestMock,
    }),
}));

function deferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;

    const promise = new Promise<T>((resolvePromise) => {
        resolve = resolvePromise;
    });

    return {
        promise,
        resolve,
    };
}

const initialChapter: Chapter = {
    id: "chapter-1",
    title: "فصل تست",
    position: 1,
    content: "",
    version: 1,
    status: "DRAFT",
    moderationState: "VISIBLE",
    wordCount: 0,
    publishedAt: null,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
};

describe("ChapterEditorPage autosave", () => {
    beforeEach(() => {
        requestMock.mockReset();
        localStorage.clear();
    });

    it("does not lose edits made while an older save is in flight", async () => {
        const firstPatch = deferred<ChapterResponse>();
        const secondPatch = deferred<ChapterResponse>();

        const patchBodies: Array<{
            title: string;
            content: string;
            expectedVersion: number;
        }> = [];

        requestMock.mockImplementation(
            (path: string, options: RequestInit = {}) => {
                if (
                    path === "/api/v1/stories/mine/story-1/chapters/chapter-1"
                ) {
                    return Promise.resolve({
                        data: {
                            chapter: initialChapter,
                        },
                    });
                }

                if (
                    path === "/api/v1/stories/story-1/chapters/chapter-1" &&
                    options.method === "PATCH"
                ) {
                    const body = JSON.parse(String(options.body)) as {
                        title: string;
                        content: string;
                        expectedVersion: number;
                    };

                    patchBodies.push(body);

                    if (patchBodies.length === 1) {
                        return firstPatch.promise;
                    }

                    if (patchBodies.length === 2) {
                        return secondPatch.promise;
                    }
                }

                throw new Error(
                    `Unexpected request: ${options.method ?? "GET"} ${path}`,
                );
            },
        );

        render(
            <MemoryRouter
                initialEntries={["/write/story-1/chapters/chapter-1"]}
            >
                <Routes>
                    <Route
                        path="/write/:storyId/chapters/:chapterId"
                        element={<ChapterEditorPage />}
                    />
                </Routes>
            </MemoryRouter>,
        );

        const editor = await screen.findByLabelText("متن فصل");

        fireEvent.change(editor, {
            target: {
                value: "AAAA",
            },
        });

        await waitFor(
            () => {
                expect(patchBodies).toHaveLength(1);
            },
            {
                timeout: 2500,
            },
        );

        expect(patchBodies[0]).toMatchObject({
            content: "AAAA",
            expectedVersion: 1,
        });

        fireEvent.change(editor, {
            target: {
                value: "AAAABBBB",
            },
        });

        await act(async () => {
            firstPatch.resolve({
                data: {
                    chapter: {
                        ...initialChapter,
                        content: "AAAA",
                        version: 2,
                        wordCount: 1,
                        updatedAt: "2026-08-17T00:00:05.000Z",
                    },
                },
            });

            await Promise.resolve();
        });

        await waitFor(
            () => {
                expect(patchBodies).toHaveLength(2);
            },
            {
                timeout: 2500,
            },
        );

        expect(patchBodies[1]).toMatchObject({
            content: "AAAABBBB",
            expectedVersion: 2,
        });

        const recoveryBeforeSecondSave = localStorage.getItem(
            "writing-platform:draft:story-1:chapter-1",
        );

        expect(recoveryBeforeSecondSave).not.toBeNull();
        expect(recoveryBeforeSecondSave).toContain("AAAABBBB");

        await act(async () => {
            secondPatch.resolve({
                data: {
                    chapter: {
                        ...initialChapter,
                        content: "AAAABBBB",
                        version: 3,
                        wordCount: 1,
                        updatedAt: "2026-08-17T00:00:06.000Z",
                    },
                },
            });

            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByText("ذخیره شد · نسخه 3")).toBeTruthy();
        });

        expect(
            localStorage.getItem("writing-platform:draft:story-1:chapter-1"),
        ).toBeNull();
    }, 7000);
});
