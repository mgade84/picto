import { useState } from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from "@mui/material";
import { useT } from "../i18n/languageContext";

// The form is a separate component so its state resets each time the
// dialog opens (Dialog unmounts its children when closed).
function NameForm({ title, initialName, submitLabel, onSubmit, onClose }) {
    const t = useT();
    const [name, setName] = useState(initialName);
    const trimmed = name.trim();

    const handleSubmit = e => {
        e.preventDefault();
        if (trimmed) onSubmit(trimmed);
    };

    return (
        <form onSubmit={handleSubmit}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    margin="dense"
                    label={t("dialog.name")}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onFocus={e => e.target.select()}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t("dialog.cancel")}</Button>
                <Button type="submit" variant="contained" disabled={!trimmed}>
                    {submitLabel}
                </Button>
            </DialogActions>
        </form>
    );
}

export default function NameDialog({ open, onClose, ...formProps }) {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <NameForm onClose={onClose} {...formProps} />
        </Dialog>
    );
}
