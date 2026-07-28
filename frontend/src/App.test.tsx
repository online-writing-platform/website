import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import App from "./App";

afterEach(() => {
    cleanup();
});

describe("App", () => {
    it("renders the home page", () => {
        window.history.pushState({}, "", "/");

        render(<App />);

        expect(
            screen.getByRole("link", {
                name: "خانه",
            }),
        ).toBeTruthy();

        expect(
            screen.getByRole("heading", {
                name: "جستجوی داستان",
            }),
        ).toBeTruthy();
    });

    it("renders the error page for unknown routes", () => {
        window.history.pushState({}, "", "/unknown-route");

        render(<App />);

        expect(
            screen.getByRole("heading", {
                name: "Oops!",
            }),
        ).toBeTruthy();
    });
});
