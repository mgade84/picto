import { useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    Radio,
    RadioGroup,
    Typography,
} from "@mui/material";
import ConfirmDialog from "../components/ConfirmDialog";
import PictogramBase from "../components/PictogramBase";
import ImportButton from "../components/ImportButton";
import StorageInfo from "../components/StorageInfo";
import { exportBackup } from "../transfer/transfer";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import { useCollections } from "../context/collectionsContext";
import { BIN_SIDES, usePreferences } from "../context/preferencesContext";
import { useLanguage, useT } from "../i18n/languageContext";
import { LANGUAGES, translate } from "../i18n/strings";

function LanguagePicker() {
    const t = useT();
    const { language, setLanguage } = useLanguage();

    return (
        <FormControl sx={{ mb: 3, display: "flex" }}>
            {/* Bilingual on purpose, so it can be found in either language. */}
            <FormLabel id="language-label">{t("settings.language")}</FormLabel>
            <RadioGroup
                aria-labelledby="language-label"
                value={language}
                onChange={e => setLanguage(e.target.value)}
            >
                {LANGUAGES.map(lang => (
                    <FormControlLabel
                        key={lang}
                        value={lang}
                        control={<Radio />}
                        // Each language is named in itself: "Dansk", "English".
                        label={translate(lang, "language.name")}
                        lang={lang}
                    />
                ))}
            </RadioGroup>
        </FormControl>
    );
}

function BinSidePicker() {
    const t = useT();
    const { binSide, setPreference } = usePreferences();

    return (
        <FormControl sx={{ mb: 3, display: "flex" }}>
            <FormLabel id="bin-side-label">{t("settings.binSide")}</FormLabel>
            <RadioGroup
                row
                aria-labelledby="bin-side-label"
                aria-describedby="bin-side-help"
                value={binSide}
                onChange={e => setPreference("binSide", e.target.value)}
            >
                {BIN_SIDES.map(side => (
                    <FormControlLabel
                        key={side}
                        value={side}
                        control={<Radio />}
                        label={t(`settings.${side}`)}
                    />
                ))}
            </RadioGroup>
            <FormHelperText id="bin-side-help" sx={{ mx: 0 }}>
                {t("settings.binSideHelp")}
            </FormHelperText>
        </FormControl>
    );
}

function BackupSection() {
    const t = useT();
    const { collections } = useCollections();
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await exportBackup(collections);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box component="section" aria-labelledby="backup-heading" sx={{ mb: 3 }}>
            <Typography id="backup-heading" variant="h5" component="h2" gutterBottom>
                {t("backup.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t("backup.hint")}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveAltIcon />}
                    disabled={saving || collections.length === 0}
                    onClick={save}
                >
                    {t(saving ? "backup.saving" : "backup.save")}
                </Button>
                <ImportButton variant="outlined" label={t("backup.restore")} />
            </Box>
        </Box>
    );
}

export default function Settings() {
    const t = useT();
    const { collections, clearAll } = useCollections();
    const [confirming, setConfirming] = useState(false);
    const [cleared, setCleared] = useState(false);
    const n = collections.length;

    return (
        <PictogramBase>
            <Typography variant="h4" component="h1" gutterBottom>
                {t("settings.title")}
            </Typography>

            <LanguagePicker />
            <BinSidePicker />

            <BackupSection />

            <Typography variant="h5" component="h2" gutterBottom>
                {t("storage.title")}
            </Typography>
            <StorageInfo />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                {t("storage.hint")}
            </Typography>

            <Typography variant="h5" component="h2" gutterBottom>
                {t("settings.danger")}
            </Typography>
            <Typography component="div">
                {t("settings.deleteAll", { n })}{" "}
                <Button
                    variant="contained"
                    color="error"
                    disabled={n === 0}
                    onClick={() => setConfirming(true)}
                >
                    {t("settings.clear")}
                </Button>
            </Typography>
            {cleared && <Typography sx={{ mt: 1 }}>{t("settings.cleared")}</Typography>}

            <ConfirmDialog
                open={confirming}
                title={t("settings.confirmTitle")}
                message={t("settings.confirmMessage", { n })}
                confirmLabel={t("settings.confirmButton")}
                onConfirm={() => {
                    clearAll();
                    setConfirming(false);
                    setCleared(true);
                }}
                onClose={() => setConfirming(false)}
            />
        </PictogramBase>
    );
}
