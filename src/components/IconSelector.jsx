import { Box, Button, Paper } from "@mui/material";
import { useT } from "../i18n/languageContext";

export default function IconSelector({ icons, onSelectIcon }) {
    const t = useT();
    return (
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", px: 1 }}>
            {icons.map(icon => (
                <Paper sx={{ m: "6px" }} key={icon.id}>
                    <Button
                        onClick={() => onSelectIcon(icon)}
                        title={icon.title ?? icon.text}
                        aria-label={t("add.icon", { text: icon.title ?? icon.text })}
                    >
                        <Box
                            component="img"
                            src={icon.thumb}
                            alt=""
                            loading="lazy"
                            sx={{ width: 64, height: 64, m: "5px", objectFit: "contain" }}
                        />
                    </Button>
                </Paper>
            ))}
        </Box>
    );
}
