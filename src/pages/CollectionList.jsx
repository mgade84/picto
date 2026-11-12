import { useState } from "react";
import {
    Avatar,
    Box,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Paper,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PrintIcon from "@mui/icons-material/Print";
import ViewListIcon from "@mui/icons-material/ViewList";
import { Link, useNavigate } from "react-router";
import ConfirmDialog from "../components/ConfirmDialog";
import NameDialog from "../components/NameDialog";
import { nextSequenceName, useCollections } from "../context/collectionsContext";
import { useEditLock } from "../context/editLockContext";
import { useT } from "../i18n/languageContext";
import useImageSrc from "../images/useImageSrc";
import { printPath, sequencePath } from "../SiteMap";

function Thumb({ img, sx }) {
    return <Avatar variant="rounded" src={useImageSrc(img)} alt="" sx={sx} />;
}

// Up to three overlapping thumbnails of the first pictograms; one on phones
// so the name gets the room.
function Preview({ pictograms }) {
    const theme = useTheme();
    const phone = useMediaQuery(theme.breakpoints.down("sm"));
    const thumbs = pictograms.slice(0, phone ? 1 : 3);
    const size = 44;

    return (
        <Box sx={{ display: "flex", flexShrink: 0, width: phone ? size : size + 2 * (size - 14) }}>
            {thumbs.length === 0 ? (
                <Avatar variant="rounded" sx={{ width: size, height: size, bgcolor: "action.hover", color: "text.secondary" }}>
                    <ViewListIcon />
                </Avatar>
            ) : (
                thumbs.map((p, i) => (
                    <Thumb
                        key={p.id}
                        img={p.img}
                        sx={{
                            width: size,
                            height: size,
                            ml: i === 0 ? 0 : "-14px",
                            zIndex: 3 - i,
                            bgcolor: "common.white",
                            border: 1,
                            borderColor: "divider",
                            "& img": { objectFit: "contain" },
                        }}
                    />
                ))
            )}
        </Box>
    );
}

// A flex row (open link, then actions) rather than MUI's absolutely
// positioned secondaryAction, so a long name is cut off before the buttons
// instead of running underneath them on narrow phones.
function SequenceRow({ sequence, locked, onRename, onDelete }) {
    const t = useT();
    return (
        <ListItem disablePadding divider sx={{ display: "flex", alignItems: "center", pr: 0.5 }}>
            <ListItemButton
                component={Link}
                to={sequencePath(sequence.id)}
                sx={{ flex: "1 1 auto", minWidth: 0, gap: 1.5, py: 1.25 }}
            >
                <Preview pictograms={sequence.pictograms} />
                <ListItemText
                    primary={sequence.name}
                    secondary={t("count", { n: sequence.pictograms.length })}
                    slotProps={{ primary: { noWrap: true } }}
                    sx={{ minWidth: 0 }}
                />
            </ListItemButton>
            <Box sx={{ display: "flex", flexShrink: 0 }}>
                {/* Printing doesn't change anything, so it stays available when locked. */}
                <IconButton
                    component={Link}
                    to={printPath(sequence.id)}
                    aria-label={t("list.print", { name: sequence.name })}
                >
                    <PrintIcon />
                </IconButton>
                {!locked && (
                    <>
                        <IconButton aria-label={t("list.rename", { name: sequence.name })} onClick={onRename}>
                            <EditIcon />
                        </IconButton>
                        <IconButton aria-label={t("list.delete", { name: sequence.name })} onClick={onDelete}>
                            <DeleteIcon />
                        </IconButton>
                    </>
                )}
            </Box>
        </ListItem>
    );
}

export default function CollectionList() {
    const t = useT();
    const { collections, create, rename, remove } = useCollections();
    const { locked } = useEditLock();
    const navigate = useNavigate();
    // { type: "create" | "rename" | "delete", sequence?, open }. Closing keeps
    // the rest so the dialog's text doesn't blank out during its exit animation.
    const [dialog, setDialog] = useState(null);
    const openDialog = (type, sequence) => setDialog({ type, sequence, open: true });
    const close = () => setDialog(d => d && { ...d, open: false });
    const isOpen = type => dialog?.open === true && dialog.type === type;

    const handleCreate = name => {
        const id = create(name);
        close();
        navigate(sequencePath(id));
    };

    return (
        <Box sx={{ maxWidth: 600, mx: "auto", p: 1.5 }}>
            <Typography variant="h5" component="h2" sx={{ my: 1.5, mx: 0.5 }}>
                {t("menu.collections")}
            </Typography>

            {collections.length === 0 ? (
                <Typography color="text.secondary" sx={{ mx: 0.5, mb: 2 }}>
                    {t(locked ? "list.emptyLocked" : "list.empty")}
                </Typography>
            ) : (
                <Paper variant="outlined" sx={{ mb: 2 }}>
                    <List disablePadding aria-label={t("list.sequences")}>
                        {collections.map(c => (
                            <SequenceRow
                                key={c.id}
                                sequence={c}
                                locked={locked}
                                onRename={() => openDialog("rename", c)}
                                onDelete={() => openDialog("delete", c)}
                            />
                        ))}
                    </List>
                </Paper>
            )}

            {!locked && (
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openDialog("create")}
                >
                    {t("list.new")}
                </Button>
            )}

            <NameDialog
                open={isOpen("create")}
                title={t("dialog.newTitle")}
                initialName={nextSequenceName(collections, n => t("sequence.defaultName", { n }))}
                submitLabel={t("dialog.create")}
                onSubmit={handleCreate}
                onClose={close}
            />
            <NameDialog
                open={isOpen("rename")}
                title={t("dialog.renameTitle")}
                initialName={dialog?.sequence?.name ?? ""}
                submitLabel={t("dialog.save")}
                onSubmit={name => {
                    rename(dialog.sequence.id, name);
                    close();
                }}
                onClose={close}
            />
            <ConfirmDialog
                open={isOpen("delete")}
                title={t("dialog.deleteTitle")}
                message={
                    dialog?.sequence &&
                    t("dialog.deleteMessage", {
                        name: dialog.sequence.name,
                        count: t("count", { n: dialog.sequence.pictograms.length }),
                    })
                }
                confirmLabel={t("dialog.delete")}
                onConfirm={() => {
                    remove(dialog.sequence.id);
                    close();
                }}
                onClose={close}
            />
        </Box>
    );
}
