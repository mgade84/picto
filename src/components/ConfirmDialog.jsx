import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import { useT } from "../i18n/languageContext";

export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onClose }) {
    const t = useT();
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{message}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t("dialog.cancel")}</Button>
                <Button onClick={onConfirm} color="error" variant="contained">
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
