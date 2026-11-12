import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    GlobalStyles,
    IconButton,
    Link,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PrintIcon from "@mui/icons-material/Print";
import RemoveIcon from "@mui/icons-material/Remove";
import { Link as RouterLink, useParams } from "react-router";
import BackHeader from "../components/BackHeader";
import PictogramBase from "../components/PictogramBase";
import { useCollections } from "../context/collectionsContext";
import { PRINT_DIRECTIONS, PRINT_ORIENTATIONS, usePreferences } from "../context/preferencesContext";
import { useT } from "../i18n/languageContext";
import useImageSrc from "../images/useImageSrc";
import { PAGE_MARGIN, TITLE_HEIGHT, maxPerLine, pageSize, sheetLayout } from "../print/layout";
import { savePdf } from "../print/makePdf";
import { Pages } from "../SiteMap";

const MM_TO_PX = 96 / 25.4;
const DESK_PAD = 16; // grey space around each sheet on screen, per side

// While printing, only the sheets are shown, one per page, at their real
// size, on paper of the chosen orientation with no browser margins (the
// sheets have their own).
function PrintStyles({ orientation }) {
    const pageHeightMm = pageSize(orientation).height;
    return (
        <GlobalStyles
            styles={{
                "@page": { size: `A4 ${orientation}`, margin: 0 },
                "@media print": {
                    "html, body": { margin: 0, padding: 0, background: "#fff" },
                    ".MuiAppBar-root, .no-print": { display: "none !important" },
                    ".print-root, .print-desk, .print-slide": {
                        padding: "0 !important",
                        margin: "0 !important",
                        background: "none !important",
                        maxWidth: "none !important",
                    },
                    ".print-pages": { display: "block !important", overflow: "visible !important" },
                    ".print-slide": { display: "block !important" },
                    ".print-scaler": {
                        height: "auto !important",
                        width: "auto !important",
                        overflow: "visible !important",
                    },
                    ".print-sheet": {
                        transform: "none !important",
                        boxShadow: "none !important",
                        margin: "0 !important",
                    },
                    // A hair under the page height so rounding never spills
                    // onto an extra page; each sheet starts a new page.
                    ".print-page": {
                        height: `calc(${pageHeightMm}mm - 1mm) !important`,
                        breakAfter: "page",
                    },
                    ".print-slide:last-of-type .print-page": { breakAfter: "auto" },
                    "*": { printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" },
                },
            }}
        />
    );
}

function PrintImage({ img, alt }) {
    return (
        <Box
            component="img"
            src={useImageSrc(img)}
            alt={alt}
            sx={{ width: "100%", flex: 1, minHeight: 0, objectFit: "contain" }}
        />
    );
}

const ellipsis = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

/** One A4 page, laid out in millimetres so it prints at exactly this size. */
function Sheet({ sequence, layout, cells, pageIndex }) {
    const { page, cellWidth, cellHeight, labelSize } = layout;
    const mm = v => `${v}mm`;

    return (
        <Box
            className="print-page"
            sx={{
                position: "relative",
                width: mm(page.width),
                height: mm(page.height),
                bgcolor: "#fff",
                color: "#000",
                overflow: "hidden",
            }}
        >
            {layout.title && (
                <Box
                    component="h1"
                    sx={{
                        position: "absolute",
                        left: mm(PAGE_MARGIN),
                        right: mm(PAGE_MARGIN),
                        top: mm(PAGE_MARGIN),
                        m: 0,
                        fontSize: "9mm",
                        lineHeight: mm(TITLE_HEIGHT - 4),
                        fontWeight: 500,
                        textAlign: "center",
                        ...ellipsis,
                    }}
                >
                    {sequence.name}
                </Box>
            )}
            {cells.map(({ index, x, y }) => {
                const p = sequence.pictograms[index];
                return (
                    <Box
                        key={p.id}
                        data-testid="print-cell"
                        sx={{
                            position: "absolute",
                            left: mm(x),
                            top: mm(y),
                            width: mm(cellWidth),
                            height: mm(cellHeight),
                            border: "0.6mm solid #000",
                            borderRadius: "2mm",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            p: "2mm",
                            boxSizing: "border-box",
                            overflow: "hidden",
                        }}
                    >
                        <PrintImage img={p.img} alt={p.text} />
                        <Box sx={{ fontSize: mm(labelSize), lineHeight: 1.2, mt: "1mm", maxWidth: "100%", ...ellipsis }}>
                            {p.text}
                        </Box>
                    </Box>
                );
            })}
            {layout.pageNumber && (
                <Box
                    sx={{
                        position: "absolute",
                        right: mm(PAGE_MARGIN),
                        bottom: mm(PAGE_MARGIN / 2 - 2),
                        fontSize: "3.5mm",
                        lineHeight: "4mm",
                    }}
                >
                    {pageIndex + 1}/{layout.pages.length}
                </Box>
            )}
        </Box>
    );
}

// Width and height left for one sheet: the desk's width, and the window
// height below the desk's top minus `reserved` (but at least 45% of the
// window, so a tall toolbar on a small phone doesn't shrink the page to a
// stamp).
function measure(el, reserved) {
    const top = el.getBoundingClientRect().top + window.scrollY;
    return {
        width: el.clientWidth,
        height: Math.max(window.innerHeight - top - reserved, window.innerHeight * 0.45),
    };
}

function useAvailableSize(ref, reserved) {
    // Start from the window size so the first paint is already scaled; the
    // observers then refine it.
    const [size, setSize] = useState(() => ({
        width: Math.max(0, window.innerWidth - 24),
        height: window.innerHeight * 0.6,
    }));
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const update = () => setSize(measure(el, reserved));
        update();
        window.addEventListener("resize", update);
        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
        observer?.observe(el);
        return () => {
            window.removeEventListener("resize", update);
            observer?.disconnect();
        };
    }, [ref, reserved]);
    return size;
}

/**
 * The pages as sheets of paper on a grey desk, one at a time, each scaled
 * so the whole page is visible. Swipe (native scroll-snap), the arrow
 * buttons or the arrow keys move between pages. Printing shows them all.
 */
function PagesPreview({ sequence, layout, orientation }) {
    const t = useT();
    const deskRef = useRef(null);
    const scrollerRef = useRef(null);
    const total = layout.pages.length;
    // Leave room under the sheet for the page navigation when it's shown.
    const available = useAvailableSize(deskRef, total > 1 ? 72 : 12);
    const [current, setCurrent] = useState(0);
    const index = Math.min(current, total - 1);

    const page = pageSize(orientation);
    const sheetPx = { width: page.width * MM_TO_PX, height: page.height * MM_TO_PX };
    const scale = Math.max(
        0.05,
        Math.min(
            1,
            (available.width - 2 * DESK_PAD) / sheetPx.width,
            (available.height - 2 * DESK_PAD) / sheetPx.height
        )
    );

    const goTo = i => {
        const target = Math.max(0, Math.min(total - 1, i));
        setCurrent(target);
        const el = scrollerRef.current;
        el?.scrollTo?.({ left: target * el.clientWidth, behavior: "smooth" });
    };

    return (
        <>
            <Box
                ref={deskRef}
                className="print-desk"
                sx={{ width: "100%", maxWidth: 1100, mx: "auto", bgcolor: "grey.300", borderRadius: 1 }}
            >
                <Box
                    ref={scrollerRef}
                    className="print-pages"
                    role="region"
                    aria-roledescription="carousel"
                    aria-label={t("print.preview")}
                    data-orientation={orientation}
                    data-pages={total}
                    data-scale={scale.toFixed(3)}
                    tabIndex={total > 1 ? 0 : undefined}
                    onScroll={e => {
                        const el = e.currentTarget;
                        if (el.clientWidth) setCurrent(Math.round(el.scrollLeft / el.clientWidth));
                    }}
                    onKeyDown={e => {
                        if (e.key === "ArrowRight") goTo(index + 1);
                        if (e.key === "ArrowLeft") goTo(index - 1);
                    }}
                    sx={{
                        display: "flex",
                        overflowX: total > 1 ? "auto" : "hidden",
                        overflowY: "hidden",
                        scrollSnapType: "x mandatory",
                        overscrollBehaviorX: "contain",
                        scrollbarWidth: "none",
                        "&::-webkit-scrollbar": { display: "none" },
                        "&:focus-visible": { outline: 3, outlineColor: "primary.main" },
                    }}
                >
                    {layout.pages.map((cells, i) => (
                        <Box
                            key={i}
                            className="print-slide"
                            role="group"
                            aria-roledescription="slide"
                            aria-label={t("print.page", { n: i + 1, total })}
                            sx={{
                                flex: "0 0 100%",
                                scrollSnapAlign: "center",
                                scrollSnapStop: "always",
                                display: "flex",
                                justifyContent: "center",
                                p: `${DESK_PAD}px`,
                                boxSizing: "border-box",
                            }}
                        >
                            {/* The sheet keeps its full layout size under the
                                transform, so the wrapper clips it; otherwise
                                WebKit makes the page scroll sideways. */}
                            <Box
                                className="print-scaler"
                                sx={{ width: sheetPx.width * scale, height: sheetPx.height * scale, overflow: "hidden" }}
                            >
                                <Paper
                                    className="print-sheet"
                                    role="img"
                                    aria-label={t("print.page", { n: i + 1, total })}
                                    elevation={4}
                                    sx={{
                                        width: "fit-content",
                                        transform: `scale(${scale})`,
                                        transformOrigin: "top left",
                                        borderRadius: 0,
                                    }}
                                >
                                    <Sheet sequence={sequence} layout={layout} cells={cells} pageIndex={i} />
                                </Paper>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
            {total > 1 && (
                <Box
                    className="no-print"
                    sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mt: 1 }}
                >
                    <IconButton aria-label={t("print.prev")} disabled={index === 0} onClick={() => goTo(index - 1)}>
                        <ChevronLeftIcon />
                    </IconButton>
                    <Typography aria-live="polite" data-testid="page-indicator" sx={{ minWidth: 110, textAlign: "center" }}>
                        {t("print.page", { n: index + 1, total })}
                    </Typography>
                    <IconButton aria-label={t("print.next")} disabled={index === total - 1} onClick={() => goTo(index + 1)}>
                        <ChevronRightIcon />
                    </IconButton>
                </Box>
            )}
        </>
    );
}

/** [-] N [+] for how many pictograms go in a row (or column), plus Auto. */
function PerLineStepper({ value, max, isAuto, direction, onChange }) {
    const t = useT();
    const label = t(`print.perLine.${direction}`);
    return (
        <Box role="group" aria-label={label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton aria-label={t(`print.fewer.${direction}`)} disabled={value <= 1} onClick={() => onChange(value - 1)}>
                <RemoveIcon />
            </IconButton>
            <Typography
                data-testid="per-line-value"
                aria-live="polite"
                sx={{ minWidth: 24, textAlign: "center", fontSize: "1.25rem", fontWeight: 500 }}
            >
                {value}
            </Typography>
            <IconButton aria-label={t(`print.more.${direction}`)} disabled={value >= max} onClick={() => onChange(value + 1)}>
                <AddIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary" sx={{ mx: 0.5 }}>
                {label}
            </Typography>
            <ToggleButton
                value="auto"
                size="small"
                selected={isAuto}
                aria-label={t("print.autoLabel")}
                onChange={() => onChange(null)}
                sx={{ px: 1.5 }}
            >
                {t("print.auto")}
            </ToggleButton>
        </Box>
    );
}

export default function PrintSequence() {
    const t = useT();
    const { id } = useParams();
    const { collections } = useCollections();
    const {
        printOrientation: orientation,
        printTitle: showTitle,
        printPerLine: perLine,
        printWrap: wrap,
        printDirection: direction,
        setPreference,
    } = usePreferences();
    const sequence = collections.find(c => c.id === id);
    const [pdf, setPdf] = useState({ working: false, error: null });

    if (!sequence) {
        return (
            <PictogramBase>
                <Typography gutterBottom>{t("sequence.missing")}</Typography>
                <Link component={RouterLink} to={Pages.home}>
                    {t("sequence.backLink")}
                </Link>
            </PictogramBase>
        );
    }

    const n = sequence.pictograms.length;
    const empty = n === 0;
    const options = { orientation, showTitle, perLine, wrap, direction };
    const layout = sheetLayout(n, options);

    const handlePdf = async () => {
        setPdf({ working: true, error: null });
        try {
            await savePdf(sequence, options);
            setPdf({ working: false, error: null });
        } catch (e) {
            setPdf({ working: false, error: e.message || String(e) });
        }
    };

    return (
        <Box className="print-root" sx={{ p: 1 }}>
            <PrintStyles orientation={orientation} />
            <Box
                className="no-print"
                sx={{ maxWidth: 1100, mx: "auto", mb: 2, display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 1.5 }}
            >
                {/* Full width, so the controls always start on their own row. */}
                <BackHeader title={sequence.name} sx={{ flex: "1 1 100%" }} />
                {/* Checkboxes first, kept together so they sit side by side. */}
                <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2 }}>
                    <FormControlLabel
                        control={
                            <Checkbox checked={showTitle} onChange={e => setPreference("printTitle", e.target.checked)} />
                        }
                        label={t("print.showTitle")}
                    />
                    <FormControlLabel
                        control={<Checkbox checked={wrap} onChange={e => setPreference("printWrap", e.target.checked)} />}
                        label={t("print.wrap")}
                    />
                </Box>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    aria-label={t("print.orientation")}
                    value={orientation}
                    onChange={(e, v) => v && setPreference("printOrientation", v)}
                >
                    {PRINT_ORIENTATIONS.map(o => (
                        <ToggleButton key={o} value={o}>
                            {t(`print.${o}`)}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    aria-label={t("print.direction")}
                    value={direction}
                    onChange={(e, v) => v && setPreference("printDirection", v)}
                >
                    {PRINT_DIRECTIONS.map(d => (
                        <ToggleButton key={d} value={d} sx={{ gap: 0.75 }}>
                            {d === "horizontal" ? <ArrowForwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                            {t(`print.${d}`)}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
                {!empty && (
                    <PerLineStepper
                        value={layout.perLine}
                        max={maxPerLine(n)}
                        isAuto={perLine === null}
                        direction={direction}
                        onChange={v => setPreference("printPerLine", v)}
                    />
                )}
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button variant="contained" startIcon={<PrintIcon />} disabled={empty} onClick={() => window.print()}>
                        {t("print.print")}
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={pdf.working ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
                        disabled={empty || pdf.working}
                        onClick={handlePdf}
                    >
                        {t(pdf.working ? "print.pdfWorking" : "print.pdf")}
                    </Button>
                </Box>
            </Box>
            {empty && (
                <Typography className="no-print" color="text.secondary" sx={{ maxWidth: 1100, mx: "auto", mb: 2 }}>
                    {t("print.empty")}
                </Typography>
            )}
            {pdf.error && (
                <Alert className="no-print" severity="error" sx={{ maxWidth: 1100, mx: "auto", mb: 2 }}>
                    {t("print.pdfFailed", { error: pdf.error })}
                </Alert>
            )}
            <PagesPreview sequence={sequence} layout={layout} orientation={orientation} />
        </Box>
    );
}
