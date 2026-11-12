import { useState } from "react";
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    pointerWithin,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Pictogram from "./Pictogram";
import TrashBin, { BIN_ID } from "./TrashBin";
import { useT } from "../i18n/languageContext";

// The bin wins when the pointer is inside it; otherwise reorder against the
// nearest card. Keyboard drags have no pointer, so they only ever reorder.
function collisionDetection(args) {
    const bin = args.droppableContainers.filter(c => c.id === BIN_ID);
    const cards = args.droppableContainers.filter(c => c.id !== BIN_ID);
    const overBin = pointerWithin({ ...args, droppableContainers: bin });
    return overBin.length > 0 ? overBin : closestCenter({ ...args, droppableContainers: cards });
}

function SortablePictogram({ data, onRelabel, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: data.id });

    return (
        <Pictogram
            ref={setNodeRef}
            data={data}
            onRelabel={onRelabel}
            dragging={isDragging}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            {...attributes}
            {...listeners}
            aria-label={data.text}
            onKeyDown={e => {
                // Delete/Backspace on the focused card deletes it (keyboard
                // alternative to dragging onto the bin).
                if (e.target === e.currentTarget && (e.key === "Delete" || e.key === "Backspace")) {
                    e.preventDefault();
                    onDelete();
                    return;
                }
                listeners.onKeyDown?.(e);
            }}
        />
    );
}

/**
 * Drag-and-drop list of pictogram cards: drag to reorder, drop on the bin
 * (shown while dragging) to delete. Mouse drags start after 8px of movement,
 * touch drags after a 250ms press so the page can still be scrolled.
 */
export default function SortablePictograms({ pictograms, onReorder, onDelete, onRelabel }) {
    const t = useT();
    const [active, setActive] = useState(null); // { id, keyboard }
    const [overBin, setOverBin] = useState(false);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const label = id => pictograms.find(p => p.id === id)?.text ?? "";
    const position = id => ({
        pos: pictograms.findIndex(p => p.id === id) + 1,
        total: pictograms.length,
    });
    const announcements = {
        onDragStart: ({ active }) => t("dnd.start", { label: label(active.id), ...position(active.id) }),
        onDragOver: ({ active, over }) =>
            over?.id === BIN_ID
                ? t("dnd.overBin", { label: label(active.id) })
                : over
                  ? t("dnd.over", { label: label(active.id), ...position(over.id) })
                  : undefined,
        onDragEnd: ({ active, over }) =>
            over?.id === BIN_ID
                ? t("dnd.endBin", { label: label(active.id) })
                : over
                  ? t("dnd.end", { label: label(active.id), ...position(over.id) })
                  : undefined,
        onDragCancel: ({ active }) => t("dnd.cancel", { label: label(active.id) }),
    };

    const reset = () => {
        setActive(null);
        setOverBin(false);
    };

    const handleDragEnd = ({ active, over }) => {
        reset();
        if (over?.id === BIN_ID) onDelete(active.id);
        else if (over && over.id !== active.id) onReorder(active.id, over.id);
    };

    const activePictogram = pictograms.find(p => p.id === active?.id);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            accessibility={{
                announcements,
                screenReaderInstructions: { draggable: t("dnd.instructions") },
            }}
            onDragStart={({ active, activatorEvent }) =>
                setActive({ id: active.id, keyboard: activatorEvent instanceof KeyboardEvent })
            }
            onDragOver={({ over }) => setOverBin(over?.id === BIN_ID)}
            onDragEnd={handleDragEnd}
            onDragCancel={reset}
        >
            <SortableContext items={pictograms.map(p => p.id)} strategy={verticalListSortingStrategy}>
                {pictograms.map(p => (
                    <SortablePictogram
                        key={p.id}
                        data={p}
                        onRelabel={text => onRelabel(p.id, text)}
                        onDelete={() => onDelete(p.id)}
                    />
                ))}
            </SortableContext>
            <TrashBin visible={Boolean(active) && !active.keyboard} disabled={active?.keyboard} />
            {/* No drop animation into the bin: the card should just vanish. */}
            <DragOverlay dropAnimation={overBin ? null : undefined}>
                {activePictogram && (
                    <Pictogram
                        data={activePictogram}
                        overlay
                        sx={{ m: 0, opacity: overBin ? 0.6 : 1, transform: overBin ? "scale(0.6)" : "rotate(2deg)", transition: "transform 120ms, opacity 120ms" }}
                    />
                )}
            </DragOverlay>
        </DndContext>
    );
}
