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
    Tab,
    Tabs,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import useArasaacSearch from "../hooks/useArasaacSearch";
import useCommonsSearch from "../images/useCommonsSearch";
import OwnImageForm from "./OwnImageForm";
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
            sx={{ m: "4px 8px", p: "2px 4px", display: "flex", alignItems: "center" }}
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

function Results({ loading, error, icons, query, onSelect, caption }) {
    const t = useT();
    if (loading) return <CircularProgress sx={{ m: 2 }} aria-label={t("add.searching")} />;
    if (error) return <Typography color="error">{t("add.failed", { error })}</Typography>;
    if (icons?.length === 0) return <Typography>{t("add.none", { query })}</Typography>;
    if (!icons) return null;
    return (
        <>
            {caption && (
                <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 0.5 }}>
                    {caption}
                </Typography>
            )}
            <IconSelector icons={icons} onSelectIcon={onSelect} />
        </>
    );
}

// These live inside the Dialog, which unmounts its children when closed, so
// queries reset every time the dialog is reopened.
function PictogramSearch({ onSelect }) {
    const t = useT();
    const { language } = useLanguage();
    const locales = SEARCH_LOCALES[language];
    const [query, setQuery] = useState("");
    const { loading, icons, locale, error } = useArasaacSearch(query, locales);
    const hint = t("add.hint");

    return (
        <>
            <SearchForm onSearch={setQuery} />
            {hint && !icons && (
                <Typography variant="body2" color="text.secondary" sx={{ mx: 1.5, mt: 1 }}>
                    {hint}
                </Typography>
            )}
            <Box sx={{ px: 1, pt: 0.5, pb: 1, textAlign: "center" }}>
                <Results
                    {...{ loading, error, icons, query, onSelect }}
                    caption={locales.length > 1 && locale && t("add.resultsIn", { language: t(`language.${locale}`) })}
                />
            </Box>
        </>
    );
}

function PhotoSearch({ onSelect }) {
    const t = useT();
    const [query, setQuery] = useState("");
    const { loading, icons, error } = useCommonsSearch(query);

    return (
        <>
            <SearchForm onSearch={setQuery} />
            {!icons && (
                <Typography variant="body2" color="text.secondary" sx={{ mx: 1.5, mt: 1 }}>
                    {t("add.photosHint")}
                </Typography>
            )}
            <Box sx={{ px: 1, pt: 0.5, pb: 1, textAlign: "center" }}>
                <Results {...{ loading, error, icons, query, onSelect }} />
            </Box>
        </>
    );
}

const SOURCES = ["pictograms", "photos", "own"];

export default function PictoAdder({ onAdd }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [source, setSource] = useState("pictograms");
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
                <Tabs
                    value={source}
                    onChange={(e, v) => setSource(v)}
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}
                >
                    {SOURCES.map(s => (
                        <Tab key={s} value={s} label={t(`add.tab.${s}`)} />
                    ))}
                </Tabs>
                {source === "pictograms" && <PictogramSearch onSelect={handleSelect} />}
                {source === "photos" && <PhotoSearch onSelect={handleSelect} />}
                {source === "own" && <OwnImageForm onAdd={handleSelect} />}
            </Dialog>
        </>
    );
}
