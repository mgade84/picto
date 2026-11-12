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
import { useLanguage, useT } from "../i18n/languageContext";
import { SEARCH_LOCALES } from "../i18n/strings";
import IconSelector from "./IconSelector";

function SearchForm({ onSearch }) {
    const t = useT();
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
                placeholder={t("add.placeholder")}
                inputProps={{ "aria-label": t("add.searchLabel") }}
            />
            <IconButton type="submit" sx={{ p: "10px" }} aria-label={t("add.search")}>
                <SearchIcon />
            </IconButton>
        </Paper>
    );
}

// Lives inside the Dialog, which unmounts its children when closed, so the
// query resets every time the dialog is reopened.
function SearchContent({ onSelect }) {
    const t = useT();
    const { language } = useLanguage();
    const locales = SEARCH_LOCALES[language];
    const [query, setQuery] = useState("");
    const { loading, icons, locale, error } = useArasaacSearch(query, locales);
    const hint = t("add.hint");

    let results = null;
    if (loading) {
        results = <CircularProgress sx={{ m: 2 }} aria-label={t("add.searching")} />;
    } else if (error) {
        results = <Typography color="error">{t("add.failed", { error })}</Typography>;
    } else if (icons?.length === 0) {
        results = <Typography>{t("add.none", { query })}</Typography>;
    } else if (icons) {
        results = (
            <>
                {locales.length > 1 && (
                    <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 0.5 }}>
                        {t("add.resultsIn", { language: t(`language.${locale}`) })}
                    </Typography>
                )}
                <IconSelector icons={icons} onSelectIcon={onSelect} />
            </>
        );
    }

    return (
        <>
            <SearchForm onSearch={setQuery} />
            {hint && !icons && (
                <Typography variant="body2" color="text.secondary" sx={{ mx: 2.5, mt: 1 }}>
                    {hint}
                </Typography>
            )}
            <Box sx={{ p: 1, textAlign: "center" }}>{results}</Box>
        </>
    );
}

export default function PictoAdder({ onAdd }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

    const handleSelect = icon => {
        setOpen(false);
        onAdd(icon);
    };

    return (
        <>
            <Fab color="primary" aria-label={t("add.button")} onClick={() => setOpen(true)} sx={{ mt: 2 }}>
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
                    {t("add.title")}
                    <IconButton
                        aria-label={t("add.close")}
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
