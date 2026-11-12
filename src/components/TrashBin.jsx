import { Box, Fade } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useDroppable } from "@dnd-kit/core";
import { usePreferences } from "../context/preferencesContext";
import { useT } from "../i18n/languageContext";

export const BIN_ID = "bin";

/**
 * Drop target for deleting pictograms; fades in at the side chosen in
 * Settings (left by default) while a card is dragged. Uses Fade (opacity
 * only), not a scaling transition, so dnd-kit measures the bin at its real
 * size when the drag starts.
 */
export default function TrashBin({ visible, disabled }) {
    const t = useT();
    const { setNodeRef, isOver } = useDroppable({ id: BIN_ID, disabled });
    const { binSide } = usePreferences();

    return (
        <Fade in={visible}>
            <Box
                ref={setNodeRef}
                role="region"
                aria-label={t("pictogram.bin")}
                aria-hidden={!visible}
                data-side={binSide}
                sx={{
                    position: "fixed",
                    [binSide]: 12,
                    top: "calc(50% - 44px)",
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: isOver ? "error.main" : "background.paper",
                    color: isOver ? "common.white" : "error.main",
                    border: 3,
                    borderColor: "error.main",
                    boxShadow: isOver ? 12 : 4,
                    zIndex: theme => theme.zIndex.appBar + 1,
                    pointerEvents: "none",
                    transition: "background-color 120ms, box-shadow 120ms, color 120ms",
                    "& svg": {
                        fontSize: isOver ? 52 : 42,
                        transition: "font-size 120ms",
                    },
                }}
            >
                <DeleteIcon />
            </Box>
        </Fade>
    );
}
