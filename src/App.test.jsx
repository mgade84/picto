import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import App from "./App";
import { STORAGE_KEY } from "./hooks/usePictograms";

const DOG = {
    _id: 7202,
    keywords: [{ keyword: "dog" }],
};
const CAT = {
    _id: 2517,
    keywords: [{ keyword: "cat" }],
};

function mockFetch(handler) {
    return vi.spyOn(globalThis, "fetch").mockImplementation(async url => {
        const { status = 200, body } = handler(String(url));
        return new Response(JSON.stringify(body), { status });
    });
}

function renderApp(path = "/") {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <App />
        </MemoryRouter>
    );
}

function storedPictograms() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)).pictograms;
}

describe("Picto", () => {
    it("searches ARASAAC and adds the chosen pictogram to the schedule", async () => {
        const fetch = mockFetch(() => ({ body: [DOG, CAT] }));
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole("button", { name: "Add pictogram" }));
        await user.type(screen.getByRole("textbox", { name: "Search pictograms" }), "pets");
        await user.click(screen.getByRole("button", { name: "Search" }));

        expect(fetch).toHaveBeenCalledWith(
            "https://api.arasaac.org/v1/pictograms/en/search/pets",
            expect.anything()
        );

        await user.click(await screen.findByRole("button", { name: "Add cat" }));

        expect(await screen.findByRole("img", { name: "cat" })).toHaveAttribute(
            "src",
            "https://static.arasaac.org/pictograms/2517/2517_500.png"
        );
        expect(storedPictograms()).toEqual([
            expect.objectContaining({ text: "cat", img: expect.stringContaining("2517_500.png") }),
        ]);
    });

    it("tells the user when nothing matches", async () => {
        mockFetch(() => ({ status: 404, body: [] }));
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole("button", { name: "Add pictogram" }));
        await user.type(screen.getByRole("textbox", { name: "Search pictograms" }), "zzz{Enter}");

        expect(await screen.findByText(/No pictograms found for “zzz”/)).toBeInTheDocument();
    });

    it("reorders and deletes pictograms, keeping data saved by older versions", async () => {
        // Same shape the 2020 Flaticon-based version stored.
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                pictograms: [
                    { id: "a", img: "a.svg", text: "wake up" },
                    { id: "b", img: "b.svg", text: "eat" },
                    { id: "c", img: "c.svg", text: "school" },
                ],
            })
        );
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole("button", { name: "Move school up" }));
        await waitFor(() =>
            expect(storedPictograms().map(p => p.text)).toEqual(["wake up", "school", "eat"])
        );

        // Moving the first one up is a no-op.
        await user.click(screen.getByRole("button", { name: "Move wake up up" }));
        expect(storedPictograms().map(p => p.text)).toEqual(["wake up", "school", "eat"]);

        await user.click(screen.getByRole("button", { name: "Delete eat" }));
        await waitFor(() =>
            expect(storedPictograms().map(p => p.text)).toEqual(["wake up", "school"])
        );
        expect(screen.queryByRole("img", { name: "eat" })).not.toBeInTheDocument();
    });

    it("clears all pictograms from the settings page", async () => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ pictograms: [{ id: "a", img: "a.svg", text: "eat" }] })
        );
        vi.spyOn(window, "confirm").mockReturnValue(true);
        const user = userEvent.setup();
        renderApp("/settings");

        await user.click(screen.getByRole("button", { name: "Clear" }));

        expect(screen.getByText("All pictograms deleted.")).toBeInTheDocument();
        expect(storedPictograms()).toEqual([]);
    });

    it("navigates to the about page from the drawer", async () => {
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole("button", { name: "Open menu" }));
        await user.click(await screen.findByRole("link", { name: "About" }));

        expect(await screen.findByRole("heading", { name: "About Picto" })).toBeInTheDocument();
        expect(screen.getByText(/Version \d+\.\d+\.\d+/)).toBeInTheDocument();
    });
});
