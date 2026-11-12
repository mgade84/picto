import { useState } from "react";
import {
    Box,
    CircularProgress,
    Dialog,
    DialogTitle,
    Fab,
    IconButton,
    InputBase,
    Paper,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import useArasaacSearch from "../hooks/useArasaacSearch";
import IconSelector from "./IconSelector";

function SearchForm({ onSearch }) {
    const [value, setValue] = useState("");

    const handleSubmit = e => {
        e.preventDefault();
        onSearch(value);
    };

    return (
        <Paper
            component="form"
            role="search"
            onSubmit={handleSubmit}
            sx={{ m: "5px 16px", p: "2px 4px", display: "flex", alignItems: "center" }}
        >
            <InputBase
                autoFocus
                value={value}
                onChange={e => setValue(e.target.value)}
                sx={{ ml: 1, flex: 1 }}
                placeholder="Search pictograms…"
                inputProps={{ "aria-label": "Search pictograms" }}
            />
            <IconButton type="submit" sx={{ p: "10px" }} aria-label="Search">
                <SearchIcon />
            </IconButton>
        </Paper>
    );
}

// Lives inside the Dialog, which unmounts its children when closed, so the
// query resets every time the dialog is reopened.
function SearchContent({ onSelect }) {
    const [query, setQuery] = useState("");
    const { loading, icons, error } = useArasaacSearch(query);

    let results = null;
    if (loading) {
        results = <CircularProgress sx={{ m: 2 }} aria-label="Searching" />;
    } else if (error) {
        results = <Typography color="error">Search failed: {error}</Typography>;
    } else if (icons?.length === 0) {
        results = <Typography>No pictograms found for “{query}”</Typography>;
    } else if (icons) {
        results = <IconSelector icons={icons} onSelectIcon={onSelect} />;
    }

    return (
        <>
            <SearchForm onSearch={setQuery} />
            <Box sx={{ p: 1, textAlign: "center" }}>{results}</Box>
        </>
    );
}

export default function PictoAdder({ onAdd }) {
    const [open, setOpen] = useState(false);
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

    const handleSelect = icon => {
        setOpen(false);
        onAdd(icon);
    };

    return (
        <>
            <Fab color="primary" aria-label="Add pictogram" onClick={() => setOpen(true)} sx={{ mt: 2 }}>
                <AddIcon />
            </Fab>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullScreen={fullScreen}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ pr: 6 }}>
                    Add a pictogram
                    <IconButton
                        aria-label="Close"
                        onClick={() => setOpen(false)}
                        sx={{ position: "absolute", right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <SearchContent onSelect={handleSelect} />
            </Dialog>
        </>
    );
}
