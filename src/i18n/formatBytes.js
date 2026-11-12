const NBSP = "\u00a0";

/**
 * "32 kB", "2,3 MB", "1,2 GB" in the UI language, with non-breaking spaces
 * so a number never wraps away from its unit.
 */
export function formatBytes(bytes, language) {
    // Small but not empty: "< 1 kB" rather than a misleading "0 kB".
    if (bytes > 0 && bytes < 1e3) return `<${NBSP}${formatBytes(1e3, language)}`;
    const units = [
        ["gigabyte", 1e9],
        ["megabyte", 1e6],
        ["kilobyte", 1e3],
    ];
    const [unit, size] = units.find(([, s]) => bytes >= s) ?? ["kilobyte", 1e3];
    return new Intl.NumberFormat(language === "da" ? "da-DK" : "en-GB", {
        style: "unit",
        unit,
        maximumFractionDigits: bytes / size < 10 ? 1 : 0,
    })
        .format(bytes / size)
        .replace(/\s/g, NBSP);
}
