import { useMemo, useState } from "react";
import { Alert, Avatar, Box, Button, Link, Typography } from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
import PictogramBase from "../components/PictogramBase";
import { useCollections } from "../context/collectionsContext";
import { useEditLock } from "../context/editLockContext";
import { useT } from "../i18n/languageContext";
import { decodeSequence } from "../transfer/link";
import { Pages, sequencePath } from "../SiteMap";

/**
 * Landing page for a shared sequence link (/import#s=...). The sequence is
 * in the URL fragment, which never reaches the server; it's validated like
 * an imported file, previewed, and added only when the user says so.
 */
export default function ImportLink() {
    const t = useT();
    const { hash } = useLocation();
    const navigate = useNavigate();
    const { importCollections } = useCollections();
    const { locked } = useEditLock();
    const sequence = useMemo(() => decodeSequence(hash), [hash]);
    const [adding, setAdding] = useState(false);

    if (!sequence || sequence.pictograms.length === 0) {
        return (
            <PictogramBase>
                <Typography variant="h5" component="h1" gutterBottom>
                    {t("link.title")}
                </Typography>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {t("link.invalid")}
                </Alert>
                <Link component={RouterLink} to={Pages.home}>
                    {t("sequence.backLink")}
                </Link>
            </PictogramBase>
        );
    }

    const add = () => {
        setAdding(true);
        const [id] = importCollections([{ name: sequence.name, pictograms: sequence.pictograms }]);
        navigate(sequencePath(id), { replace: true });
    };

    return (
        <PictogramBase>
            <Typography variant="h5" component="h1" gutterBottom>
                {t("link.title")}
            </Typography>
            <Typography sx={{ mb: 2 }}>{t("link.question", { name: sequence.name, n: sequence.pictograms.length })}</Typography>
            <Box
                aria-hidden
                sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}
                data-testid="link-preview"
            >
                {sequence.pictograms.slice(0, 12).map((p, i) => (
                    <Avatar
                        key={i}
                        variant="rounded"
                        src={p.img}
                        alt=""
                        sx={{ width: 48, height: 48, bgcolor: "common.white", border: 1, borderColor: "divider", "& img": { objectFit: "contain" } }}
                    />
                ))}
            </Box>
            {sequence.skipped > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {t("import.skipped", { n: sequence.skipped })}
                </Alert>
            )}
            {locked ? (
                <Alert severity="info">{t("link.locked")}</Alert>
            ) : (
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                    <Button component={RouterLink} to={Pages.home} replace>
                        {t("link.cancel")}
                    </Button>
                    <Button variant="contained" disabled={adding} onClick={add}>
                        {t("import.add")}
                    </Button>
                </Box>
            )}
        </PictogramBase>
    );
}
