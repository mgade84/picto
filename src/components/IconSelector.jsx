import { Box, Button } from "@mui/material";
import { useT } from "../i18n/languageContext";

// Square tiles that fill the width (3 across on a small phone), with little
// padding so the picture gets the room. Thumbnails are 300-330 px, so they
// stay sharp at this size.
export default function IconSelector({ icons, onSelectIcon }) {
    const t = useT();
    return (
        <Box
            data-testid="search-results"
            sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 0.75 }}
        >
            {icons.map(icon => (
                <Button
                    key={icon.id}
                    variant="outlined"
                    onClick={() => onSelectIcon(icon)}
                    title={icon.title ?? icon.text}
                    aria-label={t("add.icon", { text: icon.title ?? icon.text })}
                    sx={{ p: 0.5, minWidth: 0, aspectRatio: "1", borderColor: "divider" }}
                >
                    <Box
                        component="img"
                        src={icon.thumb}
                        alt=""
                        loading="lazy"
                        sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                    />
                </Button>
            ))}
        </Box>
    );
}
