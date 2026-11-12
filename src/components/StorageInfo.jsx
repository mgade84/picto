import { useEffect, useState } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { formatBytes } from "../i18n/formatBytes";
import { useLanguage, useT } from "../i18n/languageContext";

// Browsers give each site about 5 MB of localStorage (counted in characters).
const LOCAL_STORAGE_QUOTA = 5 * 1000 * 1000;

// Characters Picto keeps in localStorage (keys and values).
function localStorageUsed() {
    try {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            total += key.length + (localStorage.getItem(key)?.length ?? 0);
        }
        return total;
    } catch {
        return null;
    }
}

// Shown at least this wide (in %) when anything is stored, so a tiny but
// real amount doesn't look like an empty bar.
const MIN_VISIBLE = 1.5;

/** Bar colour: fine, getting full, nearly full. */
function usageColor(percent) {
    return percent >= 95 ? "error" : percent >= 80 ? "warning" : "primary";
}

/** The line of text plus a horizontal bar filled to how much is used. */
function UsageBar({ testId, used, quota, label }) {
    const percent = Math.min(100, (used / quota) * 100);
    const shown = used > 0 ? Math.max(MIN_VISIBLE, percent) : 0;
    return (
        <Box sx={{ mb: 1.5 }}>
            <Typography data-testid={testId} sx={{ mb: 0.5 }}>
                {label}
            </Typography>
            <LinearProgress
                variant="determinate"
                value={shown}
                color={usageColor(percent)}
                aria-label={label}
                aria-valuetext={label}
                data-testid={`${testId}-bar`}
                data-percent={percent.toFixed(2)}
                sx={{ height: 10, borderRadius: 5, bgcolor: "action.hover" }}
            />
        </Box>
    );
}

/**
 * How much browser storage Picto uses: sequences and settings against the
 * ~5 MB localStorage limit, and own images against the browser's estimate.
 * The estimate covers IndexedDB (where own images are) but not localStorage,
 * in both Safari and Chrome, so it's shown as the own-images figure, not as
 * a total. It exists only in secure contexts (HTTPS, localhost).
 */
export default function StorageInfo() {
    const t = useT();
    const { language } = useLanguage();
    const [estimate, setEstimate] = useState(null);
    const used = localStorageUsed();

    useEffect(() => {
        let current = true;
        navigator.storage
            ?.estimate?.()
            .then(e => current && e?.quota && setEstimate(e))
            .catch(() => {});
        return () => {
            current = false;
        };
    }, []);

    const fmt = b => formatBytes(b, language);
    return (
        <>
            {used !== null && (
                <UsageBar
                    testId="storage-sequences"
                    used={used}
                    quota={LOCAL_STORAGE_QUOTA}
                    label={t("storage.sequences", { used: fmt(used), quota: fmt(LOCAL_STORAGE_QUOTA) })}
                />
            )}
            {estimate && (
                <UsageBar
                    testId="storage-images"
                    used={estimate.usage ?? 0}
                    quota={estimate.quota}
                    label={t("storage.images", { used: fmt(estimate.usage ?? 0), quota: fmt(estimate.quota) })}
                />
            )}
        </>
    );
}
