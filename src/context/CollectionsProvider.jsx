import { useEffect, useMemo } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { v4 as uuid } from "uuid";
import useLocalStorage from "../hooks/useLocalStorage";
import { deleteUnusedImages } from "../images/imageStore";
import { useT } from "../i18n/languageContext";
import { CollectionsContext, LEGACY_KEY, STORAGE_KEY } from "./collectionsContext";

// Runs only when STORAGE_KEY is empty: adopts a pre-collections schedule.
function loadInitial(migratedName) {
    try {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
        if (legacy?.pictograms?.length) {
            return {
                collections: [
                    { id: uuid(), name: migratedName, pictograms: legacy.pictograms },
                ],
            };
        }
    } catch {
        // Unreadable legacy data: start fresh.
    }
    return { collections: [] };
}


export default function CollectionsProvider({ children }) {
    const t = useT();
    const [state, setState] = useLocalStorage(STORAGE_KEY, () =>
        loadInitial(t("sequence.migratedName"))
    );

    const actions = useMemo(() => {
        const updateAll = fn =>
            setState(prev => ({ collections: fn(prev.collections ?? []) }));
        const updateOne = (id, fn) =>
            updateAll(list => list.map(c => (c.id === id ? fn(c) : c)));
        const updatePictograms = (id, fn) =>
            updateOne(id, c => ({ ...c, pictograms: fn(c.pictograms ?? []) }));

        return {
            /** Creates an empty sequence and returns its id. */
            create(name) {
                const id = uuid();
                updateAll(list => [...list, { id, name, pictograms: [] }]);
                return id;
            },
            rename: (id, name) => updateOne(id, c => ({ ...c, name })),
            remove: id => updateAll(list => list.filter(c => c.id !== id)),
            clearAll: () => updateAll(() => []),

            addPictogram: (id, icon) =>
                updatePictograms(id, list => [
                    ...list,
                    {
                        id: uuid(),
                        img: icon.img,
                        text: icon.text,
                        // Photos from Wikimedia Commons keep their author and licence.
                        ...(icon.credit && { credit: icon.credit }),
                    },
                ]),
            relabelPictogram: (id, pictoId, text) =>
                updatePictograms(id, list =>
                    list.map(p => (p.id === pictoId ? { ...p, text } : p))
                ),
            removePictogram: (id, pictoId) =>
                updatePictograms(id, list => list.filter(p => p.id !== pictoId)),
            /** Puts a pictogram back at `index` (used to undo a delete). */
            insertPictogram: (id, pictogram, index) =>
                updatePictograms(id, list => [
                    ...list.slice(0, index),
                    pictogram,
                    ...list.slice(index),
                ]),
            /** Moves pictogram `fromId` to the position currently held by `toId`. */
            reorderPictogram: (id, fromId, toId) =>
                updatePictograms(id, list => {
                    const from = list.findIndex(p => p.id === fromId);
                    const to = list.findIndex(p => p.id === toId);
                    return from < 0 || to < 0 ? list : arrayMove(list, from, to);
                }),
        };
    }, [setState]);

    // Once per app start, delete own images no pictogram uses any more. Not
    // on every change, so a deleted pictogram can still be undone.
    useEffect(() => {
        const used = (state.collections ?? []).flatMap(c => (c.pictograms ?? []).map(p => p.img));
        deleteUnusedImages(used).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = useMemo(
        () => ({ collections: state.collections ?? [], ...actions }),
        [state.collections, actions]
    );

    return <CollectionsContext value={value}>{children}</CollectionsContext>;
}
