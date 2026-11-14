import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from "@mui/material";
import ConfirmDialog from "./ConfirmDialog";
import { useCollections } from "../context/collectionsContext";
import { useLanguage, useT } from "../i18n/languageContext";
import { summarize } from "../transfer/format";
import { applyImport } from "../transfer/transfer";

/**
 * Preview of a validated import (counts, date, anything left out), then
 * "Add" (the safe default) or, for backups, "Replace everything" after a
 * confirmation. Calls onDone(newIds) when finished.
 */
export default function ImportDialog({ parsed, onClose, onDone }) {
    const t = useT();
    const { language } = useLanguage();
    const { collections, importCollections } = useCollections();
    const [confirming, setConfirming] = useState(false);
    const [state, setState] = useState({ working: false, error: null });

    const counts = summarize(parsed);
    const isBackup = parsed.kind === "backup";

    const run = async replace => {
        setConfirming(false);
        setState({ working: true, error: null });
        try {
            const ids = await applyImport(parsed, importCollections, { replace });
            onDone(ids);
        } catch {
            setState({ working: false, error: t("import.error.save") });
        }
    };

    const made =
        parsed.exported && !Number.isNaN(Date.parse(parsed.exported))
            ? new Intl.DateTimeFormat(language === "da" ? "da-DK" : "en-GB", { dateStyle: "long" }).format(
                  new Date(parsed.exported)
              )
            : null;

    return (
        <>
            <Dialog open onClose={onClose} fullWidth maxWidth="xs">
                <DialogTitle>{t(isBackup ? "import.title.backup" : "import.title.sequence")}</DialogTitle>
                <DialogContent>
                    {made && (
                        <Typography color="text.secondary" gutterBottom>
                            {t("import.made", { date: made })}
                        </Typography>
                    )}
                    <Box component="dl" data-testid="import-summary" sx={{ display: "grid", gridTemplateColumns: "auto auto", columnGap: 2, m: 0 }}>
                        {[
                            ["import.sequences", counts.sequences],
                            ["import.pictograms", counts.pictograms],
                            ["import.images", counts.images],
                        ].map(([key, n]) => (
                            <Box key={key} sx={{ display: "contents" }}>
                                <Typography component="dt">{t(key)}</Typography>
                                <Typography component="dd" sx={{ m: 0, fontWeight: 600 }}>
                                    {n}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                    {counts.skipped > 0 && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            {t("import.skipped", { n: counts.skipped })}
                        </Alert>
                    )}
                    {state.error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {state.error}
                        </Alert>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        {t("import.addHint")}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
                    <Button onClick={onClose}>{t("dialog.cancel")}</Button>
                    {isBackup && collections.length > 0 && (
                        <Button color="error" disabled={state.working} onClick={() => setConfirming(true)}>
                            {t("import.replace")}
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        disabled={state.working || counts.sequences === 0}
                        startIcon={state.working ? <CircularProgress size={18} color="inherit" /> : null}
                        onClick={() => run(false)}
                    >
                        {t(state.working ? "import.working" : "import.add")}
                    </Button>
                </DialogActions>
            </Dialog>
            <ConfirmDialog
                open={confirming}
                title={t("import.replaceTitle")}
                message={t("import.replaceMessage", { n: collections.length })}
                confirmLabel={t("import.replace")}
                onConfirm={() => run(true)}
                onClose={() => setConfirming(false)}
            />
        </>
    );
}
