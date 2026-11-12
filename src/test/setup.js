import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Fail on React/MUI warnings (invalid props, key warnings, ...) instead of
// letting them scroll past in the output.
beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation((...args) => {
        throw new Error(`console.error: ${args.join(" ")}`);
    });
});

// jsdom has no object URLs; own images are shown through them.
if (!URL.createObjectURL) {
    let n = 0;
    URL.createObjectURL = () => `blob:test/${++n}`;
    URL.revokeObjectURL = () => {};
}

afterEach(() => {
    cleanup();
    localStorage.clear();
});
