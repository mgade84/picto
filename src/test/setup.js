import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Fail on React/MUI warnings (invalid props, key warnings, ...) instead of
// letting them scroll past in the output.
beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation((...args) => {
        throw new Error(`console.error: ${args.join(" ")}`);
    });
});

afterEach(() => {
    cleanup();
    localStorage.clear();
});
