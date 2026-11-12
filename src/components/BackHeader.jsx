import { Box, IconButton, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link as RouterLink } from "react-router";
import { useT } from "../i18n/languageContext";
import { Pages } from "../SiteMap";

/**
 * "← Title" header used by every page opened from the collections list
 * (sequence and print preview), so the way back looks and works the same.
 */
export default function BackHeader({ title, sx }) {
    const t = useT();
    return (
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, ...sx }}>
            <IconButton component={RouterLink} to={Pages.home} aria-label={t("sequence.back")}>
                <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" component="h2" noWrap sx={{ ml: 1, minWidth: 0 }}>
                {title}
            </Typography>
        </Box>
    );
}
