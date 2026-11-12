import { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Alert, Box, Button, FormControlLabel, Slider, Switch, TextField, Typography } from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { useT } from "../i18n/languageContext";
import { saveImage } from "../images/imageStore";
import { processImage } from "../images/processImage";

const MAX_ZOOM = 4;
const PREVIEW = 280; // px, the square crop frame on screen

/**
 * Add a pictogram from the camera or photo library. The file input without
 * `capture` makes iPhone and Android offer both "Take photo" and the photo
 * library. The user frames the square by dragging and zooming (pinch, mouse
 * wheel or the slider), or keeps the whole image. The result is shrunk and
 * stored on this device only.
 */
export default function OwnImageForm({ onAdd }) {
    const t = useT();
    const inputRef = useRef(null);
    const [file, setFile] = useState(null); // { file, url }
    const [crop, setCrop] = useState(true);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [area, setArea] = useState(null); // crop rectangle in image pixels
    const [label, setLabel] = useState("");
    const [state, setState] = useState({ working: false, error: null });

    // Release the previous photo's object URL when it's replaced or on close.
    useEffect(() => () => file && URL.revokeObjectURL(file.url), [file]);

    const handleFile = e => {
        const f = e.target.files?.[0];
        e.target.value = ""; // choosing the same file again still fires
        if (!f) return;
        setFile({ file: f, url: URL.createObjectURL(f) });
        setPosition({ x: 0, y: 0 });
        setZoom(1);
        setArea(null);
        setState({ working: false, error: null });
    };

    const handleAdd = async e => {
        e.preventDefault();
        setState({ working: true, error: null });
        try {
            const blob = await processImage(file.file, { crop, area });
            const img = await saveImage(blob);
            onAdd({ img, text: label.trim() });
        } catch (err) {
            setState({ working: false, error: err.message || String(err) });
        }
    };

    return (
        <Box component="form" onSubmit={handleAdd} sx={{ px: 2, pb: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <input ref={inputRef} type="file" accept="image/*" hidden data-testid="own-image-input" onChange={handleFile} />
            <Button
                variant={file ? "outlined" : "contained"}
                startIcon={<AddPhotoAlternateIcon />}
                onClick={() => inputRef.current?.click()}
                sx={{ alignSelf: "flex-start" }}
            >
                {t(file ? "own.other" : "own.choose")}
            </Button>
            <Typography variant="body2" color="text.secondary">
                {t("own.hint")}
            </Typography>

            {state.error && <Alert severity="error">{t("own.failed", { error: state.error })}</Alert>}

            {file && (
                <>
                    <FormControlLabel
                        control={<Switch checked={crop} onChange={e => setCrop(e.target.checked)} />}
                        label={t("own.crop")}
                    />
                    <Box
                        role="group"
                        aria-label={t(crop ? "own.cropArea" : "own.preview")}
                        data-testid="own-image-frame"
                        sx={{
                            position: "relative",
                            width: "100%",
                            maxWidth: PREVIEW,
                            aspectRatio: "1",
                            alignSelf: "center",
                            borderRadius: 1,
                            overflow: "hidden",
                            bgcolor: crop ? "grey.900" : "#fff",
                            border: crop ? 0 : "2px solid",
                        }}
                    >
                        {crop ? (
                            <Cropper
                                image={file.url}
                                crop={position}
                                zoom={zoom}
                                maxZoom={MAX_ZOOM}
                                aspect={1}
                                showGrid={false}
                                objectFit="contain"
                                onCropChange={setPosition}
                                onZoomChange={setZoom}
                                onCropComplete={(_, pixels) => setArea(pixels)}
                                cropShape="rect"
                                style={{ cropAreaStyle: { border: "3px solid #fff", color: "rgba(0,0,0,0.55)" } }}
                            />
                        ) : (
                            <Box
                                component="img"
                                src={file.url}
                                alt={t("own.preview")}
                                sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                        )}
                    </Box>
                    {crop && (
                        <>
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: -1 }}>
                                {t("own.cropHint")}
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 1 }}>
                                <ZoomOutIcon color="action" />
                                <Slider
                                    value={zoom}
                                    min={1}
                                    max={MAX_ZOOM}
                                    step={0.05}
                                    onChange={(e, v) => setZoom(v)}
                                    aria-label={t("own.zoom")}
                                    getAriaValueText={v => `${Math.round(v * 100)} %`}
                                />
                                <ZoomInIcon color="action" />
                            </Box>
                        </>
                    )}
                    <TextField
                        label={t("pictogram.label")}
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        required
                        fullWidth
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!label.trim() || state.working}
                        sx={{ alignSelf: "flex-end" }}
                    >
                        {t("own.add")}
                    </Button>
                </>
            )}
        </Box>
    );
}
