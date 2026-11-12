import { describe, expect, it } from "vitest";
import { MAX_PER_LINE, autoPerLine, sheetLayout } from "./layout";

const cellsOf = layout => layout.pages.flat();
const distinct = (cells, key) => new Set(cells.map(c => Math.round(c[key] * 1000))).size;
const rowsOn = cells => distinct(cells, "y");
const colsOn = cells => distinct(cells, "x");

describe("horizontal sequences (the default)", () => {
    it("without wrapping put the whole sequence in one row on one page", () => {
        for (const orientation of ["landscape", "portrait"]) {
            const l = sheetLayout(7, { orientation });
            expect(l.perLine).toBe(7);
            expect(l.pages).toHaveLength(1);
            expect(rowsOn(l.pages[0])).toBe(1);
        }
    });

    it("with fewer per row continue on the next pages, one row per page", () => {
        const l = sheetLayout(10, { perLine: 4 });
        expect(l.pages.map(p => p.length)).toEqual([4, 4, 2]);
        for (const p of l.pages) expect(rowsOn(p)).toBe(1);
    });

    it("read left to right, then down", () => {
        const [first] = sheetLayout(6, { orientation: "portrait", perLine: 3, wrap: true }).pages;
        expect(first[1].x).toBeGreaterThan(first[0].x);
        expect(first[1].y).toBe(first[0].y);
        expect(first[3].y).toBeGreaterThan(first[0].y);
        expect(first[3].x).toBe(first[0].x);
    });

    it("with wrapping fill each page with rows before starting the next", () => {
        const l = sheetLayout(10, { orientation: "portrait", perLine: 2, wrap: true });
        expect(l.linesPerPage).toBeGreaterThan(1);
        expect(rowsOn(l.pages[0])).toBe(l.linesPerPage);
        expect(l.pages.length).toBeLessThan(sheetLayout(10, { orientation: "portrait", perLine: 2 }).pages.length);
    });

    it("on auto with wrapping pick the largest pictograms that fit one page", () => {
        expect(sheetLayout(4, { wrap: true })).toMatchObject({ perLine: 4 });
        // 3 in portrait: 2 across is bigger than a column of 3.
        expect(autoPerLine(3, { orientation: "portrait", wrap: true })).toBe(2);
    });
});

describe("vertical sequences", () => {
    it("without wrapping put the whole sequence in one column on one page", () => {
        for (const orientation of ["landscape", "portrait"]) {
            const l = sheetLayout(5, { orientation, direction: "vertical" });
            expect(l.perLine).toBe(5);
            expect(l.pages).toHaveLength(1);
            expect(colsOn(l.pages[0])).toBe(1);
            expect(rowsOn(l.pages[0])).toBe(5);
        }
    });

    it("read top to bottom, then right", () => {
        const [first] = sheetLayout(6, { direction: "vertical", perLine: 3, wrap: true }).pages;
        expect(first[1].y).toBeGreaterThan(first[0].y);
        expect(first[1].x).toBe(first[0].x);
        expect(first[3].x).toBeGreaterThan(first[0].x);
        expect(first[3].y).toBe(first[0].y);
    });

    it("with fewer per column continue on the next pages, one column per page", () => {
        const l = sheetLayout(10, { direction: "vertical", perLine: 3 });
        expect(l.pages.map(p => p.length)).toEqual([3, 3, 3, 1]);
        for (const p of l.pages) expect(colsOn(p)).toBe(1);
    });

    it("with wrapping place columns side by side", () => {
        const l = sheetLayout(9, { direction: "vertical", perLine: 3, wrap: true });
        expect(l.pages).toHaveLength(1);
        expect(colsOn(l.pages[0])).toBe(3);
        expect(rowsOn(l.pages[0])).toBe(3);
    });
});

describe("any layout", () => {
    it("shows every pictogram exactly once, in order", () => {
        for (const direction of ["horizontal", "vertical"]) {
            const l = sheetLayout(10, { perLine: 3, wrap: true, direction });
            expect(cellsOf(l).map(c => c.index)).toEqual([...Array(10).keys()]);
        }
    });

    it("gets bigger pictograms with fewer per line", () => {
        for (const direction of ["horizontal", "vertical"]) {
            expect(sheetLayout(10, { perLine: 3, direction }).cellWidth).toBeGreaterThan(
                sheetLayout(10, { perLine: 5, direction }).cellWidth
            );
        }
    });

    it("keeps lines aligned across pages and numbers pages only when there are several", () => {
        const l = sheetLayout(10, { perLine: 3, wrap: true });
        expect(l.pages.at(-1)[0]).toMatchObject({ x: l.pages[0][0].x, y: l.pages[0][0].y });
        expect(l.pageNumber).not.toBeNull();
        expect(sheetLayout(4).pageNumber).toBeNull();
    });

    it("clamps the number per line to the sequence length and the maximum", () => {
        expect(sheetLayout(3, { perLine: 8 }).perLine).toBe(3);
        expect(sheetLayout(40, { perLine: 99 }).perLine).toBe(MAX_PER_LINE);
        expect(sheetLayout(5, { perLine: 0 }).perLine).toBe(1);
    });

    it("keeps every cell inside the page margins", () => {
        for (const orientation of ["landscape", "portrait"]) {
            for (const direction of ["horizontal", "vertical"]) {
                for (const showTitle of [true, false]) {
                    for (const wrap of [false, true]) {
                        for (const n of [1, 2, 5, 9, 23, 60]) {
                            for (const perLine of [null, 1, 2, 4, 7, 12]) {
                                const l = sheetLayout(n, { orientation, direction, showTitle, wrap, perLine });
                                expect(cellsOf(l)).toHaveLength(n);
                                for (const c of cellsOf(l)) {
                                    expect(c.x).toBeGreaterThanOrEqual(12 - 1e-6);
                                    expect(c.y).toBeGreaterThanOrEqual(12 - 1e-6);
                                    expect(c.x + l.cellWidth).toBeLessThanOrEqual(l.page.width - 12 + 1e-6);
                                    expect(c.y + l.cellHeight).toBeLessThanOrEqual(l.page.height - 12 + 1e-6);
                                }
                            }
                        }
                    }
                }
            }
        }
    });
});
