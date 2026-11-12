import { useState } from "react";
import { ButtonBase, CardMedia, InputBase, Paper, Typography } from "@mui/material";
import { useT } from "../i18n/languageContext";
import useImageSrc from "../images/useImageSrc";

// Keeps pointer and key events inside the label from reaching the card,
// whose drag-and-drop listeners would otherwise start a drag (e.g. on Space).
const isolate = {
    onPointerDown: e => e.stopPropagation(),
    onMouseDown: e => e.stopPropagation(),
    onTouchStart: e => e.stopPropagation(),
};

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
                e.stopPropagation();
                if (e.key === "Enter") save();
                if (e.key === "Escape") onCancel();
            }}
            {...isolate}
            inputProps={{ "aria-label": t("pictogram.label"), style: { textAlign: "center" } }}
            sx={{ borderBottom: 2, borderColor: "primary.main", fontSize: "1.1rem", minHeight: 44 }}
        />
    );
}

function Label({ text, onRelabel }) {
    const t = useT();
    const [editing, setEditing] = useState(false);

    if (editing) {
        return (
            <LabelEditor
                text={text}
                onSave={newText => {
                    onRelabel(newText);
                    setEditing(false);
                }}
                onCancel={() => setEditing(false)}
            />
        );
    }
    return (
        <ButtonBase
            aria-label={t("pictogram.edit", { label: text })}
            onClick={() => setEditing(true)}
            onKeyDown={e => e.stopPropagation()}
            sx={{ width: "100%", minHeight: 44, borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}
        >
            <Typography noWrap sx={{ fontSize: "1.1rem" }}>
                {text}
            </Typography>
        </ButtonBase>
    );
}

/**
 * A pictogram card. Extra props (drag listeners, ref, style) go to the card
 * itself. Without `onRelabel` the label is static (used for the drag overlay).
 */
export default function Pictogram({ data, onRelabel, dragging, overlay, sx, ...cardProps }) {
    const { img, text } = data;
    const src = useImageSrc(img);

    return (
        <Paper
            elevation={overlay ? 12 : 5}
            {...cardProps}
            sx={{
                width: 200,
                m: "10px",
                p: 1.5,
                border: "2px solid",
                cursor: overlay ? "grabbing" : "grab",
                opacity: dragging ? 0.3 : 1,
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
                touchAction: "manipulation",
                transform: overlay ? "rotate(2deg)" : undefined,
                "&:focus-visible": { outline: 3, outlineColor: "primary.main", outlineOffset: 2 },
                ...sx,
            }}
        >
            <CardMedia
                component="img"
                image={src}
                alt={text}
                draggable={false}
                sx={{ height: 160, objectFit: "contain", pointerEvents: "none" }}
            />
            <div style={{ textAlign: "center", marginTop: 4 }}>
                {onRelabel ? (
                    <Label text={text} onRelabel={onRelabel} />
                ) : (
                    <Typography noWrap sx={{ fontSize: "1.1rem", lineHeight: "44px" }}>
                        {text}
                    </Typography>
                )}
            </div>
        </Paper>
    );
}
