import { Box, Button, Paper } from "@mui/material";

export default function IconSelector({ icons, onSelectIcon }) {
    return (
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", px: 1 }}>
            {icons.map(icon => (
                <Paper sx={{ m: "6px" }} key={icon.id}>
                    <Button
                        onClick={() => onSelectIcon(icon)}
                        title={icon.text}
                        aria-label={`Add ${icon.text}`}
                    >
                        <Box
                            component="img"
                            src={icon.thumb}
                            alt=""
                            loading="lazy"
                            sx={{ width: 64, height: 64, m: "5px" }}
                        />
                    </Button>
                </Paper>
            ))}
        </Box>
    );
}
