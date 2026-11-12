import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import App from "./App";
import { LEGACY_KEY, STORAGE_KEY } from "./context/collectionsContext";
import { LANGUAGE_KEY } from "./i18n/languageContext";

const DOG = { _id: 7202, keywords: [{ keyword: "dog" }] };
const CAT = { _id: 2517, keywords: [{ keyword: "cat" }] };

function mockFetch(handler) {
    return vi.spyOn(globalThis, "fetch").mockImplementation(async url => {
        const { status = 200, body } = handler(String(url));
        return new Response(JSON.stringify(body), { status });
    });
}

// Most tests pin English; pass { language: null } to get the real default.
function renderApp(path = "/", { language = "en" } = {}) {
    if (language) localStorage.setItem(LANGUAGE_KEY, JSON.stringify(language));
    return render(
        <MemoryRouter initialEntries={[path]}>
            <App />
        </MemoryRouter>
    );
}

function stored() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)).collections;
}

function seed(collections) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ collections }));
}

const picto = (id, text) => ({ id, img: `${id}.png`, text });

const MORNING = {
    id: "m",
    name: "Morning",
    pictograms: [picto("a", "wake up"), picto("b", "eat"), picto("c", "school")],
};
const EVENING = { id: "e", name: "Evening", pictograms: [picto("d", "bath")] };

// MUI marks the page aria-hidden until a dialog has finished closing.
function dialogClosed() {
    return waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

function sequenceList() {
    return screen.getByRole("list", { name: "Sequences" });
}

describe("collections list", () => {
    it("lists sequences with their pictogram counts and opens one", async () => {
        seed([MORNING, EVENING]);
        const user = userEvent.setup();
        renderApp();

        const rows = within(sequenceList()).getAllByRole("link");
        expect(rows.map(r => r.textContent)).toEqual(["Morning3 pictograms", "Evening1 pictogram"]);

        await user.click(within(sequenceList()).getByRole("link", { name: /Evening/ }));

        expect(await screen.findByRole("heading", { name: "Evening" })).toBeInTheDocument();
        expect(screen.getByRole("img", { name: "bath" })).toBeInTheDocument();

        await user.click(screen.getByRole("link", { name: "Back to collections" }));
        expect(await screen.findByRole("list", { name: "Sequences" })).toBeInTheDocument();
    });

    it("creates a new sequence and opens it", async () => {
        seed([MORNING]);
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole("button", { name: "New sequence" }));
        const name = screen.getByRole("textbox", { name: "Name" });
        expect(name).toHaveValue("Sequence 2");
        await user.clear(name);
        await user.type(name, "Bedtime{Enter}");

        expect(await screen.findByRole("heading", { name: "Bedtime" })).toBeInTheDocument();
        expect(stored().map(c => c.name)).toEqual(["Morning", "Bedtime"]);
    });

    it("renames a sequence", async () => {
        seed([MORNING, EVENING]);
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole("button", { name: "Rename Evening" }));
        const name = screen.getByRole("textbox", { name: "Name" });
        expect(name).toHaveValue("Evening");
        await user.clear(name);
        expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
        await user.type(name, "  Bedtime  ");
        await user.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(stored().map(c => c.name)).toEqual(["Morning", "Bedtime"]));
        await dialogClosed();
        expect(within(sequenceList()).getByRole("link", { name: /Bedtime/ })).toBeInTheDocument();
    });

    it("deletes a sequence after confirmation", async () => {
        seed([MORNING, EVENING]);
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole("button", { name: "Delete Morning" }));
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent("“Morning” and its 3 pictograms will be deleted.");

        // Cancelling keeps it.
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await dialogClosed();
        expect(stored()).toHaveLength(2);

        await user.click(screen.getByRole("button", { name: "Delete Morning" }));
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

        await waitFor(() => expect(stored().map(c => c.name)).toEqual(["Evening"]));
        await dialogClosed();
        expect(within(sequenceList()).queryByRole("link", { name: /Morning/ })).not.toBeInTheDocument();
    });

    it("shows an empty state when there are no sequences", () => {
        renderApp();
        expect(screen.getByText(/No sequences yet/)).toBeInTheDocument();
    });

    it("migrates a single schedule saved by older versions", () => {
        // Shape stored by v0.1 (Flaticon) and v0.2.
        localStorage.setItem(
            LEGACY_KEY,
            JSON.stringify({ pictograms: [picto("a", "wake up"), picto("b", "eat")] })
        );
        renderApp();

        expect(within(sequenceList()).getByRole("link", { name: /My sequence/ })).toHaveTextContent("2 pictograms");
        expect(stored()).toEqual([
            expect.objectContaining({ name: "My sequence", pictograms: [picto("a", "wake up"), picto("b", "eat")] }),
        ]);
    });
});

describe("sequence", () => {
    it("searches ARASAAC and adds the chosen pictogram", async () => {
        seed([{ ...EVENING, pictograms: [] }]);
        const fetch = mockFetch(() => ({ body: [DOG, CAT] }));
        const user = userEvent.setup();
        renderApp("/sequence/e");

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
        expect(stored()[0].pictograms).toEqual([
            expect.objectContaining({ text: "cat", img: expect.stringContaining("2517_500.png") }),
        ]);
    });

    it("tells the user when nothing matches", async () => {
        seed([EVENING]);
        mockFetch(() => ({ status: 404, body: [] }));
        const user = userEvent.setup();
        renderApp("/sequence/e");

        await user.click(screen.getByRole("button", { name: "Add pictogram" }));
        await user.type(screen.getByRole("textbox", { name: "Search pictograms" }), "zzz{Enter}");

        expect(await screen.findByText(/No pictograms found for “zzz”/)).toBeInTheDocument();
    });

    it("reorders and deletes pictograms without touching other sequences", async () => {
        seed([MORNING, EVENING]);
        const user = userEvent.setup();
        renderApp("/sequence/m");
        const texts = () => stored()[0].pictograms.map(p => p.text);

        await user.click(screen.getByRole("button", { name: "Move school up" }));
        await waitFor(() => expect(texts()).toEqual(["wake up", "school", "eat"]));

        // Moving the first one up is a no-op.
        await user.click(screen.getByRole("button", { name: "Move wake up up" }));
        expect(texts()).toEqual(["wake up", "school", "eat"]);

        await user.click(screen.getByRole("button", { name: "Delete eat" }));
        await waitFor(() => expect(texts()).toEqual(["wake up", "school"]));
        expect(screen.queryByRole("img", { name: "eat" })).not.toBeInTheDocument();
        expect(stored()[1]).toEqual(EVENING);
    });

    it("handles a link to a sequence that no longer exists", () => {
        renderApp("/sequence/gone");
        expect(screen.getByText(/doesn’t exist any more/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to my collections" })).toHaveAttribute("href", "/");
    });
});

describe("app shell", () => {
    it("clears all sequences from the settings page", async () => {
        seed([MORNING, EVENING]);
        const user = userEvent.setup();
        renderApp("/settings");

        await user.click(screen.getByRole("button", { name: "Clear" }));
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete all" }));

        expect(screen.getByText("All sequences deleted.")).toBeInTheDocument();
        expect(stored()).toEqual([]);
    });

    it("navigates via the drawer", async () => {
        const user = userEvent.setup();
        renderApp("/settings");

        await user.click(screen.getByRole("button", { name: "Open menu" }));
        await user.click(await screen.findByRole("link", { name: "About" }));
        expect(await screen.findByRole("heading", { name: "About Picto" })).toBeInTheDocument();
        expect(screen.getByText(/Version \d+\.\d+\.\d+/)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Open menu" }));
        await user.click(await screen.findByRole("link", { name: "My Picto collections" }));
        expect(await screen.findByRole("heading", { name: "My Picto collections" })).toBeInTheDocument();
    });
});

describe("labels", () => {
    it("edits a pictogram's label in place", async () => {
        seed([MORNING]);
        const user = userEvent.setup();
        renderApp("/sequence/m");

        await user.click(screen.getByRole("button", { name: "Edit label of eat" }));
        const field = screen.getByRole("textbox", { name: "Label" });
        expect(field).toHaveValue("eat");
        await user.clear(field);
        await user.type(field, "breakfast{Enter}");

        expect(screen.getByRole("img", { name: "breakfast" })).toBeInTheDocument();
        expect(stored()[0].pictograms.map(p => p.text)).toEqual(["wake up", "breakfast", "school"]);

        // Escape cancels and an empty label is ignored.
        await user.click(screen.getByRole("button", { name: "Edit label of school" }));
        await user.type(screen.getByRole("textbox", { name: "Label" }), "xyz{Escape}");
        await user.click(screen.getByRole("button", { name: "Edit label of school" }));
        await user.clear(screen.getByRole("textbox", { name: "Label" }));
        await user.keyboard("{Enter}");
        expect(stored()[0].pictograms.map(p => p.text)).toEqual(["wake up", "breakfast", "school"]);
    });
});

describe("language", () => {
    it("defaults to Danish", () => {
        renderApp("/", { language: null });
        expect(screen.getByRole("heading", { name: "Mine Picto-samlinger" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Ny sekvens" })).toBeInTheDocument();
        expect(document.documentElement.lang).toBe("da");
    });

    it("switches language from settings and remembers it", async () => {
        const user = userEvent.setup();
        const { unmount } = renderApp("/settings", { language: null });

        expect(screen.getByRole("heading", { name: "Indstillinger" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Dansk" })).toBeChecked();

        await user.click(screen.getByRole("radio", { name: "English" }));
        expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
        expect(document.documentElement.lang).toBe("en");
        expect(JSON.parse(localStorage.getItem(LANGUAGE_KEY))).toBe("en");

        unmount();
        renderApp("/", { language: null });
        expect(screen.getByRole("heading", { name: "My Picto collections" })).toBeInTheDocument();
    });

    it("names new and migrated sequences in Danish", async () => {
        localStorage.setItem(LEGACY_KEY, JSON.stringify({ pictograms: [picto("a", "spise")] }));
        const user = userEvent.setup();
        renderApp("/", { language: null });

        const list = screen.getByRole("list", { name: "Sekvenser" });
        expect(within(list).getByRole("link", { name: /Min sekvens/ })).toHaveTextContent("1 piktogram");
        await user.click(screen.getByRole("button", { name: "Ny sekvens" }));
        expect(screen.getByRole("textbox", { name: "Navn" })).toHaveValue("Sekvens 2");
    });

    it("searches Norwegian first in Danish, falling back to English", async () => {
        seed([{ ...EVENING, pictograms: [] }]);
        const fetch = mockFetch(url =>
            url.includes("/nb/") ? { status: 404, body: [] } : { body: [CAT] }
        );
        const user = userEvent.setup();
        renderApp("/sequence/e", { language: null });

        await user.click(screen.getByRole("button", { name: "Tilføj piktogram" }));
        expect(screen.getByText(/ARASAAC har endnu ingen danske søgeord/)).toBeInTheDocument();
        await user.type(screen.getByRole("textbox", { name: "Søg efter piktogrammer" }), "cat{Enter}");

        expect(await screen.findByText("Resultater på engelsk")).toBeInTheDocument();
        expect(fetch.mock.calls.map(c => String(c[0]))).toEqual([
            "https://api.arasaac.org/v1/pictograms/nb/search/cat",
            "https://api.arasaac.org/v1/pictograms/en/search/cat",
        ]);
        expect(screen.getByRole("button", { name: "Tilføj cat" })).toBeInTheDocument();
    });

    it("uses Norwegian results when there are any", async () => {
        seed([{ ...EVENING, pictograms: [] }]);
        const fetch = mockFetch(() => ({ body: [{ _id: 7202, keywords: [{ keyword: "hund" }] }] }));
        const user = userEvent.setup();
        renderApp("/sequence/e", { language: null });

        await user.click(screen.getByRole("button", { name: "Tilføj piktogram" }));
        await user.type(screen.getByRole("textbox", { name: "Søg efter piktogrammer" }), "hund{Enter}");

        expect(await screen.findByText("Resultater på norsk")).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
