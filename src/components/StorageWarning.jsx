import { useEffect, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { useT } from "../i18n/languageContext";
import { STORAGE_ERROR_EVENT } from "../hooks/useLocalStorage";

/**
 * Tells the user when a change couldn't be saved (browser storage full or
 * blocked). Stays until closed, and comes back on the next failed save.
 */
export default function StorageWarning() {
    const t = useT();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const show = () => setOpen(true);
        window.addEventListener(STORAGE_ERROR_EVENT, show);
        return () => window.removeEventListener(STORAGE_ERROR_EVENT, show);
    }, []);

    return (
        <Snackbar open={open} anchorOrigin={{ vertical: "top", horizontal: "center" }} sx={{ top: { xs: 72 } }}>
            <Alert severity="error" variant="filled" onClose={() => setOpen(false)} sx={{ width: "100%" }}>
                {t("storage.saveFailed")}
            </Alert>
        </Snackbar>
    );
}
