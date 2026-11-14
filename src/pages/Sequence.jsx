import { useState } from "react";
import { Button, IconButton, Link, Snackbar, Stack, Typography } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import { Link as RouterLink, useParams } from "react-router";
import BackHeader from "../components/BackHeader";
import ShareDialog from "../components/ShareDialog";
import PictoAdder from "../components/PictoAdder";
import PictogramBase from "../components/PictogramBase";
import SortablePictograms from "../components/SortablePictograms";
import Pictogram from "../components/Pictogram";
import { useCollections } from "../context/collectionsContext";
import { useEditLock } from "../context/editLockContext";
import { useT } from "../i18n/languageContext";
import { Pages } from "../SiteMap";

export default function Sequence() {
    const t = useT();
    const { id } = useParams();
    const {
        collections,
        addPictogram,
        removePictogram,
        insertPictogram,
        reorderPictogram,
        relabelPictogram,
    } = useCollections();
    const { locked } = useEditLock();
    const sequence = collections.find(c => c.id === id);
    // Last deleted pictogram and where it was, for the Undo snackbar. Kept
    // after closing so the message doesn't blank out while it animates away.
    const [deleted, setDeleted] = useState(null);
    const closeSnackbar = () => setDeleted(d => d && { ...d, open: false });
    const [sharing, setSharing] = useState(false);

    if (!sequence) {
        return (
            <PictogramBase>
                <Typography gutterBottom>{t("sequence.missing")}</Typography>
                <Link component={RouterLink} to={Pages.home}>
                    {t("sequence.backLink")}
                </Link>
            </PictogramBase>
        );
    }

    const handleDelete = pictoId => {
        const index = sequence.pictograms.findIndex(p => p.id === pictoId);
        if (index < 0) return;
        setDeleted({ pictogram: sequence.pictograms[index], index, open: true });
        removePictogram(id, pictoId);
    };

    const handleUndo = () => {
        insertPictogram(id, deleted.pictogram, deleted.index);
        closeSnackbar();
    };

    return (
        <Stack sx={{ alignItems: "center", pb: 4 }}>
            <BackHeader
                title={sequence.name}
                sx={{ width: "100%", maxWidth: 600, px: 1, pt: 1 }}
                actions={
                    // Sharing changes nothing here, so it's available when locked too.
                    <IconButton aria-label={t("share.button")} onClick={() => setSharing(true)}>
                        <ShareIcon />
                    </IconButton>
                }
            />
            <ShareDialog sequence={sequence} open={sharing} onClose={() => setSharing(false)} />
            {!locked && sequence.pictograms.length > 0 && (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ maxWidth: 600, px: 2, textAlign: "center" }}
                >
                    {t("sequence.hint")}
                </Typography>
            )}
            {locked ? (
                // Read-only: plain cards, no drag and drop, static labels.
                sequence.pictograms.map(p => <Pictogram key={p.id} data={p} sx={{ cursor: "default" }} />)
            ) : (
                <>
                    <SortablePictograms
                        pictograms={sequence.pictograms}
                        onReorder={(fromId, toId) => reorderPictogram(id, fromId, toId)}
                        onDelete={handleDelete}
                        onRelabel={(pictoId, text) => relabelPictogram(id, pictoId, text)}
                    />
                    <PictoAdder onAdd={icon => addPictogram(id, icon)} />
                </>
            )}
            <Snackbar
                open={deleted?.open === true}
                autoHideDuration={6000}
                onClose={(e, reason) => reason !== "clickaway" && closeSnackbar()}
                message={deleted && t("pictogram.deleted", { label: deleted.pictogram.text })}
                action={
                    <Button size="small" onClick={handleUndo} sx={{ color: "primary.light", fontWeight: 600 }}>
                        {t("pictogram.undo")}
                    </Button>
                }
            />
        </Stack>
    );
}
