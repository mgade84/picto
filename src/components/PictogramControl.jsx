import { Box, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import UpIcon from "@mui/icons-material/ArrowUpward";
import DownIcon from "@mui/icons-material/ArrowDownward";
import { useT } from "../i18n/languageContext";

export default function PictogramControl({ label, onUp, onDown, onEdit, onDelete }) {
    const t = useT();
    return (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
            <IconButton aria-label={t("pictogram.up", { label })} onClick={onUp}>
                <UpIcon />
            </IconButton>
            <IconButton aria-label={t("pictogram.down", { label })} onClick={onDown}>
                <DownIcon />
            </IconButton>
            <IconButton aria-label={t("pictogram.edit", { label })} onClick={onEdit}>
                <EditIcon />
            </IconButton>
            <IconButton aria-label={t("pictogram.delete", { label })} onClick={onDelete}>
                <DeleteIcon />
            </IconButton>
        </Box>
    );
}
