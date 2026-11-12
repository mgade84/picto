// Print layout in millimetres, shared by the on-screen sheets and the PDF so
// they always match.
//
// A sequence is laid out in *lines*: rows read left to right (direction
// "horizontal") or columns read top to bottom ("vertical"). `perLine` is how
// many pictograms go in a line. Without wrapping each page holds one line;
// with it, lines fill the page side by side, then continue on the next page.

export const A4 = { width: 210, height: 297 };
export const PAGE_MARGIN = 12;
export const TITLE_HEIGHT = 16;
export const GAP = 6;
// A cell is a square pictogram plus a label strip below it.
export const CELL_ASPECT = 1.22;
export const MAX_CELL = 110;
export const MAX_PER_LINE = 12;

export function pageSize(orientation) {
    return orientation === "landscape"
        ? { width: A4.height, height: A4.width }
        : { width: A4.width, height: A4.height };
}

function innerArea(page, showTitle) {
    const top = PAGE_MARGIN + (showTitle ? TITLE_HEIGHT : 0);
    return { top, width: page.width - 2 * PAGE_MARGIN, height: page.height - top - PAGE_MARGIN };
}

/**
 * Cell size for `perLine` pictograms in a line: the line fills the page in
 * its direction, but a cell never outgrows the page the other way (one line
 * must fit) nor MAX_CELL.
 */
function grid(n, perLine, inner, direction, wrap) {
    const cellWidth =
        direction === "horizontal"
            ? Math.min((inner.width - GAP * (perLine - 1)) / perLine, MAX_CELL, inner.height / CELL_ASPECT)
            : Math.min((inner.height - GAP * (perLine - 1)) / perLine / CELL_ASPECT, MAX_CELL, inner.width);
    const cellHeight = cellWidth * CELL_ASPECT;
    // Lines stack across the direction: rows downwards, columns rightwards.
    const room = direction === "horizontal" ? inner.height : inner.width;
    const lineSize = direction === "horizontal" ? cellHeight : cellWidth;
    const linesPerPage = wrap ? Math.max(1, Math.floor((room + GAP + 1e-9) / (lineSize + GAP))) : 1;
    const perPage = perLine * linesPerPage;
    return {
        perLine,
        cellWidth,
        cellHeight,
        linesPerPage,
        perPage,
        pageCount: Math.max(1, Math.ceil(n / perPage)),
    };
}

export function maxPerLine(n) {
    return Math.max(1, Math.min(n, MAX_PER_LINE));
}

const defaults = { orientation: "landscape", showTitle: true, direction: "horizontal", wrap: false, perLine: null };

/**
 * The number per line that gives the largest pictograms while keeping the
 * whole sequence on as few pages as possible (one, unless it's very long).
 */
export function autoPerLine(n, options = {}) {
    const { orientation, showTitle, direction, wrap } = { ...defaults, ...options };
    const inner = innerArea(pageSize(orientation), showTitle);
    let best = null;
    for (let perLine = 1; perLine <= maxPerLine(n); perLine++) {
        const g = grid(n, perLine, inner, direction, wrap);
        if (
            !best ||
            g.pageCount < best.pageCount ||
            (g.pageCount === best.pageCount && g.cellWidth > best.cellWidth + 1e-9)
        ) {
            best = g;
        }
    }
    return best.perLine;
}

/**
 * The full layout for `n` pictograms. Options: orientation ("landscape" |
 * "portrait"), showTitle, direction ("horizontal" | "vertical"), wrap, and
 * perLine (null = auto). Returns the page size, cell size, label size, the
 * title and page-number positions (or null), and `pages`: a list of pages,
 * each a list of { index, x, y } cell positions. The block of cells is
 * centred on the page; with several pages every page uses the same origin,
 * so lines line up from page to page.
 */
export function sheetLayout(n, options = {}) {
    const { orientation, showTitle, direction, wrap, perLine: chosen } = { ...defaults, ...options };
    const page = pageSize(orientation);
    const inner = innerArea(page, showTitle);
    const auto = autoPerLine(n, { orientation, showTitle, direction, wrap });
    const perLine = Math.min(Math.max(1, chosen ?? auto), maxPerLine(n));
    const g = grid(n, perLine, inner, direction, wrap);
    const horizontal = direction === "horizontal";

    // How many cells along a line and how many lines the block spans.
    const along = g.pageCount === 1 ? Math.min(perLine, Math.max(1, n)) : perLine;
    const lines = g.pageCount === 1 ? Math.max(1, Math.ceil(n / perLine)) : g.linesPerPage;
    const cols = horizontal ? along : lines;
    const rows = horizontal ? lines : along;
    const blockWidth = cols * g.cellWidth + GAP * (cols - 1);
    const blockHeight = rows * g.cellHeight + GAP * (rows - 1);
    const x0 = PAGE_MARGIN + (inner.width - blockWidth) / 2;
    const y0 = inner.top + (inner.height - blockHeight) / 2;

    const pages = Array.from({ length: g.pageCount }, (_, p) => {
        const count = Math.max(0, Math.min(g.perPage, n - p * g.perPage));
        return Array.from({ length: count }, (_, j) => {
            const pos = j % perLine; // position along the line
            const line = Math.floor(j / perLine);
            const col = horizontal ? pos : line;
            const row = horizontal ? line : pos;
            return {
                index: p * g.perPage + j,
                x: x0 + col * (g.cellWidth + GAP),
                y: y0 + row * (g.cellHeight + GAP),
            };
        });
    });

    return {
        page,
        direction,
        perLine,
        autoPerLine: auto,
        cellWidth: g.cellWidth,
        cellHeight: g.cellHeight,
        linesPerPage: g.linesPerPage,
        pages,
        labelSize: Math.max(4, Math.min(9, g.cellWidth * 0.11)),
        title: showTitle ? { x: page.width / 2, y: PAGE_MARGIN + TITLE_HEIGHT / 2 - 1 } : null,
        // Page number ("1/2") in the bottom margin, only with several pages.
        pageNumber: g.pageCount > 1 ? { x: page.width - PAGE_MARGIN, y: page.height - PAGE_MARGIN / 2 } : null,
    };
}
