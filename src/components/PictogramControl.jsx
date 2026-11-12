import { Box, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import UpIcon from "@mui/icons-material/ArrowUpward";
import DownIcon from "@mui/icons-material/ArrowDownward";

export default function PictogramControl({ label, onUp, onDown, onDelete }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
            <IconButton aria-label={`Move ${label} up`} onClick={onUp}>
                <UpIcon />
            </IconButton>
            <IconButton aria-label={`Move ${label} down`} onClick={onDown}>
                <DownIcon />
            </IconButton>
            <IconButton aria-label={`Delete ${label}`} onClick={onDelete}>
                <DeleteIcon />
            </IconButton>
        </Box>
    );
}
