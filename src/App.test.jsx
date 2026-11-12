import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import App from "./App";
import { LEGACY_KEY, STORAGE_KEY } from "./context/collectionsContext";
import { LANGUAGE_KEY } from "./i18n/languageContext";
import { LOCK_KEY } from "./context/editLockContext";
import { PREFERENCES_KEY } from "./context/preferencesContext";
import { isLocal, loadImage } from "./images/imageStore";

// jsdom can't decode or draw images; the real processing is covered by e2e.
vi.mock("./images/processImage", () => ({
    processImage: vi.fn(async (file, { crop }) => new Blob([`processed:${crop ? "crop" : "whole"}`], { type: "image/jpeg" })),
}));

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

        const rows = within(sequenceList()).getAllByRole("link", { name: /pictogram/ });
        expect(rows.map(r => r.textContent)).toEqual(["Morning3 pictograms", "Evening1 pictogram"]);

        await user.click(within(sequenceList()).getByRole("link", { name: /^Evening/ }));

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
        expect(within(sequenceList()).getByRole("link", { name: /^Bedtime/ })).toBeInTheDocument();
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
        expect(within(sequenceList()).queryByRole("link", { name: /^Morning/ })).not.toBeInTheDocument();
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

        expect(within(sequenceList()).getByRole("link", { name: /^My sequence/ })).toHaveTextContent("2 pictograms");
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

    it("deletes the focused card with the Delete key and can undo it", async () => {
        seed([MORNING, EVENING]);
        const user = userEvent.setup();
        renderApp("/sequence/m");
        const texts = () => stored()[0].pictograms.map(p => p.text);

        // Cards are drag handles; the old per-card buttons are gone.
        expect(screen.queryByRole("button", { name: /Delete eat|Move/ })).not.toBeInTheDocument();
        expect(screen.getByText(/Drag to reorder/)).toBeInTheDocument();

        screen.getByRole("button", { name: "eat" }).focus();
        await user.keyboard("{Delete}");

        expect(texts()).toEqual(["wake up", "school"]);
        expect(screen.queryByRole("img", { name: "eat" })).not.toBeInTheDocument();
        expect(stored()[1]).toEqual(EVENING);

        expect(await screen.findByText("“eat” deleted")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Undo" }));
        expect(texts()).toEqual(["wake up", "eat", "school"]);
    });

    it("does not delete when Delete is pressed while editing a label", async () => {
        seed([MORNING]);
        const user = userEvent.setup();
        renderApp("/sequence/m");

        await user.click(screen.getByRole("button", { name: "Edit label of eat" }));
        await user.keyboard("{Delete}{Backspace}{Escape}");
        expect(stored()[0].pictograms.map(p => p.text)).toEqual(["wake up", "eat", "school"]);
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
    it("edits a pictogram's label by pressing it", async () => {
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
        expect(within(list).getByRole("link", { name: /^Min sekvens/ })).toHaveTextContent("1 piktogram");
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

describe("edit lock", () => {
    const lockButton = () => screen.getByRole("button", { name: "Lock editing" });

    it("makes the collections list read-only, but sequences can still be opened", async () => {
        seed([MORNING, EVENING]);
        const user = userEvent.setup();
        renderApp();

        expect(lockButton()).toHaveAttribute("aria-pressed", "false");
        expect(screen.getByRole("button", { name: "Rename Morning" })).toBeInTheDocument();

        await user.click(lockButton());
        expect(lockButton()).toHaveAttribute("aria-pressed", "true");
        expect(screen.queryByRole("button", { name: /Rename|Delete/ })).not.toBeInTheDocument();
        // Printing changes nothing, so it's still offered.
        expect(screen.getByRole("link", { name: "Print Morning" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "New sequence" })).not.toBeInTheDocument();

        await user.click(within(sequenceList()).getByRole("link", { name: /^Evening/ }));
        expect(await screen.findByRole("heading", { name: "Evening" })).toBeInTheDocument();
    });

    it("makes a sequence read-only", async () => {
        seed([MORNING]);
        const user = userEvent.setup();
        renderApp("/sequence/m");

        await user.click(lockButton());

        // Cards are no longer drag handles or deletable, labels aren't editable,
        // and there's no way to add pictograms.
        expect(screen.getByRole("img", { name: "eat" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "eat" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Edit label/ })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Add pictogram" })).not.toBeInTheDocument();
        expect(screen.queryByText(/Drag to reorder/)).not.toBeInTheDocument();

        await user.click(lockButton());
        expect(screen.getByRole("button", { name: "Edit label of eat" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add pictogram" })).toBeInTheDocument();
    });

    it("stays locked after a reload", async () => {
        seed([MORNING]);
        const user = userEvent.setup();
        const { unmount } = renderApp();
        await user.click(lockButton());
        expect(JSON.parse(localStorage.getItem(LOCK_KEY))).toBe(true);

        unmount();
        renderApp("/sequence/m");
        expect(lockButton()).toHaveAttribute("aria-pressed", "true");
        expect(screen.queryByRole("button", { name: "Add pictogram" })).not.toBeInTheDocument();
    });

    it("is labelled in Danish", () => {
        renderApp("/", { language: null });
        expect(screen.getByRole("button", { name: "Lås redigering" })).toBeInTheDocument();
    });
});

describe("bin position", () => {
    const binEl = () => document.querySelector("[data-side]");

    it("defaults to the left and can be moved to the right in settings", async () => {
        seed([MORNING]);
        const user = userEvent.setup();
        const { unmount } = renderApp("/settings");

        expect(screen.getByRole("radiogroup", { name: "Bin position" })).toHaveAccessibleDescription(
            "Where the bin appears while you drag a pictogram."
        );
        expect(screen.getByRole("radio", { name: "Left" })).toBeChecked();

        await user.click(screen.getByRole("radio", { name: "Right" }));
        expect(screen.getByRole("radio", { name: "Right" })).toBeChecked();
        expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY))).toMatchObject({ binSide: "right" });

        unmount();
        renderApp("/sequence/m");
        expect(binEl()).toHaveAttribute("data-side", "right");
    });

    it("places the bin on the left by default", () => {
        seed([MORNING]);
        renderApp("/sequence/m");
        expect(binEl()).toHaveAttribute("data-side", "left");
    });

    it("ignores an invalid stored value", () => {
        seed([MORNING]);
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ binSide: "middle" }));
        renderApp("/sequence/m");
        expect(binEl()).toHaveAttribute("data-side", "left");
    });

    it("is labelled in Danish", () => {
        renderApp("/settings", { language: null });
        expect(screen.getByRole("radiogroup", { name: "Skraldespandens placering" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Venstre" })).toBeChecked();
        expect(screen.getByRole("radio", { name: "Højre" })).not.toBeChecked();
    });
});

describe("printing", () => {
    const preview = () => screen.getByRole("region", { name: "Print preview" });
    const many = n => Array.from({ length: n }, (_, i) => picto(`x${i}`, `step ${i + 1}`));

    it("opens a print preview from the collections list", async () => {
        seed([MORNING, EVENING]);
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole("link", { name: "Print Morning" }));

        expect(await screen.findByRole("region", { name: "Print preview" })).toHaveAttribute("data-orientation", "landscape");
        expect(screen.getByRole("img", { name: "Page 1 of 1" })).toBeInTheDocument();
        expect(screen.getAllByTestId("print-cell").map(c => c.textContent)).toEqual(["wake up", "eat", "school"]);
        expect(screen.getByRole("heading", { level: 1, name: "Morning" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Save PDF" })).toBeEnabled();
        // Same "←" back link as the sequence view.
        expect(screen.getByRole("link", { name: "Back to collections" })).toHaveAttribute("href", "/");
        expect(screen.getByRole("heading", { level: 2, name: "Morning" })).toBeInTheDocument();
        // One page: no page navigation.
        expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
    });

    it("switches orientation and title, remembers them, and prints", async () => {
        seed([MORNING]);
        const print = vi.spyOn(window, "print").mockImplementation(() => {});
        const user = userEvent.setup();
        const { unmount } = renderApp("/sequence/m/print");

        await user.click(screen.getByRole("button", { name: "Portrait" }));
        expect(preview()).toHaveAttribute("data-orientation", "portrait");
        await user.click(screen.getByRole("checkbox", { name: "Show title" }));
        expect(screen.queryByRole("heading", { level: 1, name: "Morning" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Print" }));
        expect(print).toHaveBeenCalledTimes(1);

        unmount();
        renderApp("/sequence/m/print");
        expect(preview()).toHaveAttribute("data-orientation", "portrait");
        expect(screen.getByRole("checkbox", { name: "Show title" })).not.toBeChecked();
    });

    it("sets how many pictograms go across with +/-, spreading over pages, and remembers it", async () => {
        seed([{ id: "long", name: "Long", pictograms: many(10) }]);
        const user = userEvent.setup();
        const { unmount } = renderApp("/sequence/long/print");
        const value = () => Number(screen.getByTestId("per-line-value").textContent);

        // Auto: everything on one page.
        expect(screen.getByRole("button", { name: "Automatic number" })).toHaveAttribute("aria-pressed", "true");
        expect(preview()).toHaveAttribute("data-pages", "1");
        const auto = value();

        // Fewer across: bigger pictograms, so they continue on more pages.
        for (let v = auto; v > 2; v--) await user.click(screen.getByRole("button", { name: "Fewer per row" }));
        expect(value()).toBe(2);
        expect(Number(preview().dataset.pages)).toBeGreaterThan(1);
        expect(screen.getByRole("button", { name: "Automatic number" })).toHaveAttribute("aria-pressed", "false");
        expect(screen.getByText(/^Page 1 of \d+$/)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
        // Every pictogram is on some page, once.
        expect(screen.getAllByTestId("print-cell")).toHaveLength(10);
        expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY))).toMatchObject({ printPerLine: 2 });

        await user.click(screen.getByRole("button", { name: "Next page" }));
        expect(screen.getByText(/^Page 2 of \d+$/)).toBeInTheDocument();

        unmount();
        renderApp("/sequence/long/print");
        expect(value()).toBe(2);

        await userEvent.setup().click(screen.getByRole("button", { name: "Automatic number" }));
        expect(value()).toBe(auto);
        expect(preview()).toHaveAttribute("data-pages", "1");
    });

    it("wraps the sequence onto rows when asked, off by default, and remembers it", async () => {
        seed([{ id: "long", name: "Long", pictograms: many(10) }]);
        const user = userEvent.setup();
        const { unmount } = renderApp("/sequence/long/print");
        // Portrait, where two rows of 2 fit on a page.
        await user.click(screen.getByRole("button", { name: "Portrait" }));

        const wrapBox = screen.getByRole("checkbox", { name: "Wrap the sequence" });
        expect(wrapBox).not.toBeChecked();
        // Unwrapped: 2 across means 5 pages of one row each.
        await user.click(screen.getByRole("button", { name: "Fewer per row" }));
        while (Number(screen.getByTestId("per-line-value").textContent) > 2) {
            await user.click(screen.getByRole("button", { name: "Fewer per row" }));
        }
        expect(preview()).toHaveAttribute("data-pages", "5");

        // Wrapped: rows fill each page, so fewer pages.
        await user.click(wrapBox);
        expect(Number(preview().dataset.pages)).toBeLessThan(5);
        expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY))).toMatchObject({ printWrap: true, printPerLine: 2 });

        unmount();
        renderApp("/sequence/long/print");
        expect(screen.getByRole("checkbox", { name: "Wrap the sequence" })).toBeChecked();
    });

    it("lays the sequence out vertically when asked, relabelling +/- and remembering it", async () => {
        seed([MORNING]);
        const user = userEvent.setup();
        const { unmount } = renderApp("/sequence/m/print");
        const lefts = () => new Set(screen.getAllByTestId("print-cell").map(c => getComputedStyle(c).left)).size;

        expect(screen.getByRole("button", { name: "Horizontal" })).toHaveAttribute("aria-pressed", "true");
        expect(lefts()).toBe(3); // one row
        expect(screen.getByRole("group", { name: "Pictograms per row" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Vertical" }));
        expect(lefts()).toBe(1); // one column
        expect(screen.getByRole("group", { name: "Pictograms per column" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Fewer per column" })).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY))).toMatchObject({ printDirection: "vertical" });

        unmount();
        renderApp("/sequence/m/print");
        expect(screen.getByRole("button", { name: "Vertical" })).toHaveAttribute("aria-pressed", "true");
    });

    it("limits +/- to between 1 and the number of pictograms", async () => {
        seed([MORNING]);
        const user = userEvent.setup();
        renderApp("/sequence/m/print");
        expect(screen.getByTestId("per-line-value")).toHaveTextContent("3");
        expect(screen.getByRole("button", { name: "More per row" })).toBeDisabled();
        await user.click(screen.getByRole("button", { name: "Fewer per row" }));
        await user.click(screen.getByRole("button", { name: "Fewer per row" }));
        expect(screen.getByTestId("per-line-value")).toHaveTextContent("1");
        expect(screen.getByRole("button", { name: "Fewer per row" })).toBeDisabled();
    });

    it("can't print an empty sequence", () => {
        seed([{ ...EVENING, pictograms: [] }]);
        renderApp("/sequence/e/print");
        expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Save PDF" })).toBeDisabled();
        expect(screen.getByText(/This sequence is empty/)).toBeInTheDocument();
    });

    it("is in Danish", () => {
        seed([MORNING]);
        renderApp("/sequence/m/print", { language: null });
        expect(screen.getByRole("button", { name: "Liggende" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Stående" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Udskriv" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Gem PDF" })).toBeInTheDocument();
        expect(screen.getByRole("group", { name: "Piktogrammer pr. række" })).toBeInTheDocument();
        expect(screen.getByRole("checkbox", { name: "Ombryd sekvensen" })).not.toBeChecked();
        expect(screen.getByRole("group", { name: "Sekvensens retning" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Vandret" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Lodret" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Færre pr. række" })).toBeInTheDocument();
        expect(screen.getByRole("img", { name: "Side 1 af 1" })).toBeInTheDocument();
    });
});


describe("own images", () => {
    const openOwnTab = async user => {
        await user.click(screen.getByRole("button", { name: "Add pictogram" }));
        await user.click(screen.getByRole("tab", { name: "Own image" }));
    };

    it("adds a photo from the camera or library, stored on the device", async () => {
        seed([{ ...EVENING, pictograms: [] }]);
        const user = userEvent.setup();
        renderApp("/sequence/e");
        await openOwnTab(user);

        expect(screen.getByText("The image is stored on this device only.")).toBeInTheDocument();
        const input = screen.getByTestId("own-image-input");
        expect(input).toHaveAttribute("accept", "image/*");
        // No `capture`: phones then offer both the camera and the library.
        expect(input).not.toHaveAttribute("capture");

        await user.upload(input, new File(["raw"], "photo.jpg", { type: "image/jpeg" }));
        // Cropping is on by default, with a frame to drag and a zoom slider.
        expect(screen.getByRole("switch", { name: "Crop to a square" })).toBeChecked();
        expect(screen.getByRole("group", { name: "Choose the crop" })).toBeInTheDocument();
        expect(screen.getByText(/Pinch or use the slider to zoom/)).toBeInTheDocument();
        const zoom = screen.getByRole("slider", { name: "Zoom" });
        expect(zoom).toHaveValue("1");
        zoom.focus();
        await user.keyboard("{ArrowRight}{ArrowRight}");
        expect(Number(zoom.value)).toBeGreaterThan(1);

        const add = screen.getByRole("button", { name: "Add" });
        expect(add).toBeDisabled(); // needs a label
        await user.type(screen.getByRole("textbox", { name: "Label" }), "my room");
        await user.click(add);

        await waitFor(() => expect(stored()[0].pictograms).toHaveLength(1));
        const [p] = stored()[0].pictograms;
        expect(p.text).toBe("my room");
        expect(isLocal(p.img)).toBe(true);
        // The image itself is in IndexedDB, not localStorage.
        expect(await (await loadImage(p.img)).text()).toBe("processed:crop");
        await waitFor(() => expect(screen.getByRole("img", { name: "my room" })).toHaveAttribute("src", expect.stringMatching(/^blob:/)));
    });

    it("can keep the whole image instead of cropping", async () => {
        seed([{ ...EVENING, pictograms: [] }]);
        const user = userEvent.setup();
        renderApp("/sequence/e");
        await openOwnTab(user);

        await user.upload(screen.getByTestId("own-image-input"), new File(["raw"], "photo.jpg", { type: "image/jpeg" }));
        await user.click(screen.getByRole("switch", { name: "Crop to a square" }));
        // The whole image is shown instead of the crop frame, with no zoom.
        expect(screen.getByRole("img", { name: "Preview" })).toBeInTheDocument();
        expect(screen.queryByRole("slider", { name: "Zoom" })).not.toBeInTheDocument();
        await user.type(screen.getByRole("textbox", { name: "Label" }), "whole");
        await user.click(screen.getByRole("button", { name: "Add" }));

        await waitFor(() => expect(stored()[0].pictograms).toHaveLength(1));
        expect(await (await loadImage(stored()[0].pictograms[0].img)).text()).toBe("processed:whole");
    });

    it("is labelled in Danish", async () => {
        seed([{ ...EVENING, pictograms: [] }]);
        const user = userEvent.setup();
        renderApp("/sequence/e", { language: null });
        await user.click(screen.getByRole("button", { name: "Tilføj piktogram" }));
        expect(screen.getByRole("tab", { name: "Piktogrammer" })).toHaveAttribute("aria-selected", "true");
        await user.click(screen.getByRole("tab", { name: "Eget billede" }));
        expect(screen.getByRole("button", { name: "Tag foto eller vælg billede" })).toBeInTheDocument();
        expect(screen.getByText("Billedet gemmes kun på denne enhed.")).toBeInTheDocument();
    });
});

describe("photos from Wikimedia Commons", () => {
    const commonsResponse = {
        query: {
            pages: {
                11: {
                    pageid: 11,
                    index: 2,
                    title: "File:Brown dog.jpg",
                    imageinfo: [
                        {
                            thumburl: "https://upload.wikimedia.org/thumb/a/ab/Brown_dog.jpg/960px-Brown_dog.jpg?utm_source=commons",
                            descriptionurl: "https://commons.wikimedia.org/wiki/File:Brown_dog.jpg",
                            extmetadata: {
                                Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Jane">Jane Doe</a>' },
                                LicenseShortName: { value: "CC BY-SA 4.0" },
                            },
                        },
                    ],
                },
                10: {
                    pageid: 10,
                    index: 1,
                    title: "File:Puppy.png",
                    imageinfo: [
                        {
                            thumburl: "https://upload.wikimedia.org/c/cd/Puppy.png", // small original: no width part
                            descriptionurl: "https://commons.wikimedia.org/wiki/File:Puppy.png",
                            extmetadata: { LicenseShortName: { value: "CC0" } },
                        },
                    ],
                },
            },
        },
    };

    it("searches Commons and adds a photo with its credit, shown on the About page", async () => {
        seed([{ ...EVENING, pictograms: [] }]);
        const fetch = mockFetch(() => ({ body: commonsResponse }));
        const user = userEvent.setup();
        renderApp("/sequence/e");

        await user.click(screen.getByRole("button", { name: "Add pictogram" }));
        await user.click(screen.getByRole("tab", { name: "Photos" }));
        expect(screen.getByText(/Wikimedia Commons/)).toBeInTheDocument();
        await user.type(screen.getByRole("textbox", { name: "Search pictograms" }), "hund{Enter}");

        const url = new URL(String(fetch.mock.calls[0][0]));
        expect(url.origin + url.pathname).toBe("https://commons.wikimedia.org/w/api.php");
        expect(url.searchParams.get("origin")).toBe("*");
        expect(url.searchParams.get("gsrsearch")).toBe("hund filetype:bitmap|drawing");
        expect(url.searchParams.get("iiurlwidth")).toBe("960"); // a standard Commons width

        // Results in Commons' order (index), named after the file.
        const results = await screen.findAllByRole("button", { name: /^Add / });
        expect(results.map(b => b.getAttribute("aria-label"))).toEqual(["Add Puppy", "Add Brown dog"]);
        // The grid uses the standard 330px thumbnail; small originals as they are.
        const thumbs = results.map(b => b.querySelector("img").getAttribute("src"));
        expect(thumbs).toEqual([
            "https://upload.wikimedia.org/c/cd/Puppy.png",
            "https://upload.wikimedia.org/thumb/a/ab/Brown_dog.jpg/330px-Brown_dog.jpg?utm_source=commons",
        ]);

        await user.click(screen.getByRole("button", { name: "Add Brown dog" }));
        await waitFor(() => expect(stored()[0].pictograms).toHaveLength(1));
        expect(stored()[0].pictograms[0]).toMatchObject({
            text: "hund", // the search word, editable afterwards
            img: "https://upload.wikimedia.org/thumb/a/ab/Brown_dog.jpg/960px-Brown_dog.jpg?utm_source=commons",
            credit: {
                author: "Jane Doe",
                license: "CC BY-SA 4.0",
                url: "https://commons.wikimedia.org/wiki/File:Brown_dog.jpg",
            },
        });

        await dialogClosed();
        await user.click(screen.getByRole("button", { name: "Open menu" }));
        await user.click(await screen.findByRole("link", { name: "About" }));
        const credits = await screen.findByRole("list", { name: "Photos from Wikimedia Commons" });
        expect(credits).toHaveTextContent("Jane Doe, CC BY-SA 4.0");
        expect(within(credits).getByRole("link", { name: "Jane Doe" })).toHaveAttribute(
            "href",
            "https://commons.wikimedia.org/wiki/File:Brown_dog.jpg"
        );
    });

    it("shows no credits section when no Commons photos are used", async () => {
        seed([MORNING]);
        renderApp("/about");
        expect(screen.queryByRole("list", { name: "Photos from Wikimedia Commons" })).not.toBeInTheDocument();
    });
});
