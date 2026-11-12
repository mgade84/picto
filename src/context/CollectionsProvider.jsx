import { useMemo } from "react";
import { v4 as uuid } from "uuid";
import useLocalStorage from "../hooks/useLocalStorage";
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

function swap([...arr], i, j) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
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
                    { id: uuid(), img: icon.img, text: icon.text },
                ]),
            relabelPictogram: (id, pictoId, text) =>
                updatePictograms(id, list =>
                    list.map(p => (p.id === pictoId ? { ...p, text } : p))
                ),
            removePictogram: (id, pictoId) =>
                updatePictograms(id, list => list.filter(p => p.id !== pictoId)),
            movePictogram: (id, pictoId, delta) =>
                updatePictograms(id, list => {
                    const i = list.findIndex(p => p.id === pictoId);
                    const j = i + delta;
                    return i < 0 || j < 0 || j >= list.length ? list : swap(list, i, j);
                }),
        };
    }, [setState]);

    const value = useMemo(
        () => ({ collections: state.collections ?? [], ...actions }),
        [state.collections, actions]
    );

    return <CollectionsContext value={value}>{children}</CollectionsContext>;
}
