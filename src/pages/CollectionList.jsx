import { useState } from "react";
import {
    Avatar,
    AvatarGroup,
    Box,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Paper,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ViewListIcon from "@mui/icons-material/ViewList";
import { Link, useNavigate } from "react-router";
import ConfirmDialog from "../components/ConfirmDialog";
import NameDialog from "../components/NameDialog";
import { nextSequenceName, useCollections } from "../context/collectionsContext";
import { useT } from "../i18n/languageContext";
import { sequencePath } from "../SiteMap";

function Preview({ pictograms }) {
    if (pictograms.length === 0) {
        return (
            <Avatar variant="rounded" sx={{ bgcolor: "action.hover", color: "text.secondary" }}>
                <ViewListIcon />
            </Avatar>
        );
    }
    return (
        <AvatarGroup max={3} spacing="small" sx={{ justifyContent: "flex-end", "& .MuiAvatar-root": { width: 40, height: 40 } }}>
            {pictograms.slice(0, 3).map(p => (
                <Avatar
                    key={p.id}
                    variant="rounded"
                    src={p.img}
                    alt=""
                    sx={{ bgcolor: "common.white", border: 1, borderColor: "divider" }}
                />
            ))}
        </AvatarGroup>
    );
}

function SequenceRow({ sequence, onRename, onDelete }) {
    const t = useT();
    return (
        <ListItem
            disablePadding
            divider
            secondaryAction={
                <>
                    <IconButton aria-label={t("list.rename", { name: sequence.name })} onClick={onRename}>
                        <EditIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label={t("list.delete", { name: sequence.name })} onClick={onDelete}>
                        <DeleteIcon />
                    </IconButton>
                </>
            }
            sx={{ "& .MuiListItemSecondaryAction-root": { right: 12 } }}
        >
            <ListItemButton component={Link} to={sequencePath(sequence.id)} sx={{ pr: 14 }}>
                <ListItemAvatar sx={{ minWidth: 112, mr: 1 }}>
                    <Preview pictograms={sequence.pictograms} />
                </ListItemAvatar>
                <ListItemText
                    primary={sequence.name}
                    secondary={t("count", { n: sequence.pictograms.length })}
                    slotProps={{ primary: { noWrap: true } }}
                />
            </ListItemButton>
        </ListItem>
    );
}

export default function CollectionList() {
    const t = useT();
    const { collections, create, rename, remove } = useCollections();
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
                    {t("list.empty")}
                </Typography>
            ) : (
                <Paper variant="outlined" sx={{ mb: 2 }}>
                    <List disablePadding aria-label={t("list.sequences")}>
                        {collections.map(c => (
                            <SequenceRow
                                key={c.id}
                                sequence={c}
                                onRename={() => openDialog("rename", c)}
                                onDelete={() => openDialog("delete", c)}
                            />
                        ))}
                    </List>
                </Paper>
            )}

            <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openDialog("create")}
            >
                {t("list.new")}
            </Button>

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
