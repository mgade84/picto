import { useState } from "react";
import {
    Button,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    Typography,
} from "@mui/material";
import ConfirmDialog from "../components/ConfirmDialog";
import PictogramBase from "../components/PictogramBase";
import { useCollections } from "../context/collectionsContext";
import { useLanguage, useT } from "../i18n/languageContext";
import { LANGUAGES, translate } from "../i18n/strings";

function LanguagePicker() {
    const t = useT();
    const { language, setLanguage } = useLanguage();

    return (
        <FormControl sx={{ mb: 3 }}>
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
