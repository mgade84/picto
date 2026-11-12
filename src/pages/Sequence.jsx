import { Box, IconButton, Link, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link as RouterLink, useParams } from "react-router";
import Pictogram from "../components/Pictogram";
import PictoAdder from "../components/PictoAdder";
import PictogramBase from "../components/PictogramBase";
import { useCollections } from "../context/collectionsContext";
import { useT } from "../i18n/languageContext";
import { Pages } from "../SiteMap";

export default function Sequence() {
    const t = useT();
    const { id } = useParams();
    const { collections, addPictogram, removePictogram, movePictogram, relabelPictogram } =
        useCollections();
    const sequence = collections.find(c => c.id === id);

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

    return (
        <Stack sx={{ alignItems: "center", pb: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", width: "100%", maxWidth: 600, px: 1, pt: 1 }}>
                <IconButton component={RouterLink} to={Pages.home} aria-label={t("sequence.back")}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5" component="h2" noWrap sx={{ ml: 1 }}>
                    {sequence.name}
                </Typography>
            </Box>
            {sequence.pictograms.map(p => (
                <Pictogram
                    key={p.id}
                    data={p}
                    onDelete={pictoId => removePictogram(id, pictoId)}
                    onUp={pictoId => movePictogram(id, pictoId, -1)}
                    onDown={pictoId => movePictogram(id, pictoId, +1)}
                    onRelabel={(pictoId, text) => relabelPictogram(id, pictoId, text)}
                />
            ))}
            <PictoAdder onAdd={icon => addPictogram(id, icon)} />
        </Stack>
    );
}
