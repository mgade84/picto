import { useRef, useState } from "react";
import { Alert, Button, Snackbar } from "@mui/material";
import FileOpenIcon from "@mui/icons-material/FileOpen";
import ImportDialog from "./ImportDialog";
import { useT } from "../i18n/languageContext";
import { readImportFile } from "../transfer/transfer";

/**
 * Button + file picker for Picto files (backups and shared sequences).
 * Validates the file, shows the import preview, and reports the result.
 */
export default function ImportButton({ label, onImported, ...buttonProps }) {
    const t = useT();
    const inputRef = useRef(null);
    const [parsed, setParsed] = useState(null);
    const [message, setMessage] = useState(null); // { severity, text }

    const handleFile = async e => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        try {
            setParsed(await readImportFile(file));
        } catch (err) {
            setMessage({ severity: "error", text: t(`import.error.${err.code ?? "read"}`) });
        }
    };

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept=".json,application/json"
                hidden
                data-testid="import-input"
                onChange={handleFile}
            />
            <Button startIcon={<FileOpenIcon />} onClick={() => inputRef.current?.click()} {...buttonProps}>
                {label ?? t("import.button")}
            </Button>
            {/* Mounted per file, so each import starts from a fresh state. */}
            {parsed && (
                <ImportDialog
                    parsed={parsed}
                    onClose={() => setParsed(null)}
                    onDone={ids => {
                        setParsed(null);
                        setMessage({ severity: "success", text: t("import.done", { n: ids.length }) });
                        onImported?.(ids);
                    }}
                />
            )}
            <Snackbar
                open={Boolean(message)}
                autoHideDuration={6000}
                onClose={(e, reason) => reason !== "clickaway" && setMessage(null)}
            >
                <Alert severity={message?.severity ?? "info"} variant="filled" onClose={() => setMessage(null)}>
                    {message?.text}
                </Alert>
            </Snackbar>
        </>
    );
}
