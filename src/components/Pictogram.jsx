import { CardContent, CardMedia, Paper, Typography } from "@mui/material";
import PictogramControl from "./PictogramControl";

export default function Pictogram({ data, onDelete, onDown, onUp }) {
    const { id, img, text } = data;

    return (
        <Paper
            elevation={5}
            sx={{ width: 200, m: "10px", border: "2px solid" }}
        >
            <CardContent>
                <CardMedia
                    component="img"
                    image={img}
                    alt={text}
                    sx={{ height: 160, objectFit: "contain" }}
                />
                <Typography align="center" noWrap>
                    {text}
                </Typography>
                <PictogramControl
                    label={text}
                    onDelete={() => onDelete(id)}
                    onDown={() => onDown(id)}
                    onUp={() => onUp(id)}
                />
            </CardContent>
        </Paper>
    );
}
