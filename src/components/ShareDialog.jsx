import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    TextField,
    Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ShareIcon from "@mui/icons-material/Share";
import { useT } from "../i18n/languageContext";
import { LONG_LINK_PICTOGRAMS, linkStatus, sequenceLink } from "../transfer/link";
import { exportSequence } from "../transfer/transfer";

/** Share one sequence: as a file (with own images) or as a link. */
export default function ShareDialog({ sequence, open, onClose }) {
    const t = useT();
    const [working, setWorking] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [qrSrc, setQrSrc] = useState(null); // data URL, or "error" if the link doesn't fit in a QR code
    const status = linkStatus(sequence);
    const linkable = status === "ok" || status === "long";
    const link = linkable ? sequenceLink(sequence) : "";

    const shareFile = async () => {
        setWorking(true);
        try {
            await exportSequence(sequence);
        } finally {
            setWorking(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
        } catch {
            // No clipboard (e.g. not HTTPS): the link is selectable in the field.
        }
    };

    const toggleQr = async () => {
        setShowQr(!showQr);
        if (showQr || qrSrc) return;
        try {
            // Made on the device, in its own chunk; nothing is sent anywhere.
            const { default: QRCode } = await import("qrcode");
            const svg = await QRCode.toString(link, { type: "svg", errorCorrectionLevel: "M", margin: 2 });
            setQrSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
        } catch {
            setQrSrc("error");
        }
    };

    const canShareLink = typeof navigator.share === "function";

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{t("share.title", { name: sequence.name })}</DialogTitle>
            <DialogContent>
                <Typography variant="h6" component="h3" sx={{ fontSize: "1rem", fontWeight: 600 }}>
                    {t("share.file")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t("share.fileHint")}
                </Typography>
                <Button
                    variant="contained"
                    startIcon={working ? <CircularProgress size={18} color="inherit" /> : <InsertDriveFileIcon />}
                    disabled={working}
                    onClick={shareFile}
                >
                    {t(working ? "share.working" : "share.file")}
                </Button>

                <Divider sx={{ my: 2.5 }} />

                <Typography variant="h6" component="h3" sx={{ fontSize: "1rem", fontWeight: 600 }}>
                    {t("share.link")}
                </Typography>
                {linkable ? (
                    <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            {t("share.linkHint")}
                        </Typography>
                        {status === "long" && (
                            <Alert severity="warning" sx={{ mb: 1.5 }}>
                                {t("share.longLink", { max: LONG_LINK_PICTOGRAMS })}
                            </Alert>
                        )}
                        <TextField
                            label={t("share.linkLabel")}
                            value={link}
                            fullWidth
                            size="small"
                            slotProps={{ htmlInput: { readOnly: true } }}
                            onFocus={e => e.target.select()}
                        />
                        <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
                            <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={copy}>
                                {t("share.copy")}
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<QrCode2Icon />}
                                aria-expanded={showQr}
                                aria-controls="share-qr"
                                onClick={toggleQr}
                            >
                                {t("share.qr")}
                            </Button>
                            {canShareLink && (
                                <Button
                                    variant="outlined"
                                    startIcon={<ShareIcon />}
                                    onClick={() => navigator.share({ url: link, title: sequence.name }).catch(() => {})}
                                >
                                    {t("share.shareLink")}
                                </Button>
                            )}
                        </Box>
                        {showQr && (
                            <Box id="share-qr" sx={{ mt: 1.5, textAlign: "center" }}>
                                {qrSrc === "error" ? (
                                    <Alert severity="info">{t("share.qrTooLong")}</Alert>
                                ) : qrSrc ? (
                                    <>
                                        <Box
                                            component="img"
                                            src={qrSrc}
                                            alt={t("share.qrAlt")}
                                            sx={{ width: "min(100%, 280px)", bgcolor: "#fff", display: "block", mx: "auto" }}
                                        />
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            {t("share.qrHint")}
                                        </Typography>
                                    </>
                                ) : (
                                    <CircularProgress size={28} />
                                )}
                            </Box>
                        )}
                        {copied && (
                            <Typography role="status" variant="body2" color="success.main" sx={{ mt: 1 }}>
                                {t("share.copied")}
                            </Typography>
                        )}
                    </>
                ) : (
                    <Alert severity="info" sx={{ mt: 1 }}>
                        {t(status === "tooBig" ? "share.tooBigLink" : "share.noLink")}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t("add.close")}</Button>
            </DialogActions>
        </Dialog>
    );
}
