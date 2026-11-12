import { useState } from "react";
import { CardContent, CardMedia, InputBase, Paper, Typography } from "@mui/material";
import PictogramControl from "./PictogramControl";
import { useT } from "../i18n/languageContext";

// Inline editor for the card's label. Enter or leaving the field saves,
// Escape cancels; an empty label is ignored.
function LabelEditor({ text, onSave, onCancel }) {
    const t = useT();
    const [value, setValue] = useState(text);

    const save = () => {
        const trimmed = value.trim();
        if (trimmed && trimmed !== text) onSave(trimmed);
        else onCancel();
    };

    return (
        <InputBase
            autoFocus
            fullWidth
            value={value}
            onChange={e => setValue(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={save}
            onKeyDown={e => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") onCancel();
            }}
            inputProps={{ "aria-label": t("pictogram.label"), style: { textAlign: "center" } }}
            sx={{ borderBottom: 2, borderColor: "primary.main" }}
        />
    );
}

export default function Pictogram({ data, onDelete, onDown, onUp, onRelabel }) {
    const { id, img, text } = data;
    const [editing, setEditing] = useState(false);

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
                {editing ? (
                    <LabelEditor
                        text={text}
                        onSave={newText => {
                            onRelabel(id, newText);
                            setEditing(false);
                        }}
                        onCancel={() => setEditing(false)}
                    />
                ) : (
                    <Typography align="center" noWrap onDoubleClick={() => setEditing(true)}>
                        {text}
                    </Typography>
                )}
                <PictogramControl
                    label={text}
                    onDelete={() => onDelete(id)}
                    onDown={() => onDown(id)}
                    onUp={() => onUp(id)}
                    onEdit={() => setEditing(true)}
                />
            </CardContent>
        </Paper>
    );
}
