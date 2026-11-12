import { v4 as uuid } from "uuid";
import useLocalStorage from "./useLocalStorage";

// localStorage key. The stored shape is { pictograms: [{ id, img, text }] }
// and must stay compatible with data saved by earlier versions of the app.
export const STORAGE_KEY = "pictograms";

function swap([...arr], i, j) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
}

/** The user's ordered pictogram schedule, persisted in localStorage. */
export default function usePictograms() {
    const [state, setState] = useLocalStorage(STORAGE_KEY, { pictograms: [] });
    const pictograms = state.pictograms ?? [];

    const update = fn => setState(prev => ({ pictograms: fn(prev.pictograms ?? []) }));

    const move = (id, delta) =>
        update(list => {
            const i = list.findIndex(p => p.id === id);
            const j = i + delta;
            return i < 0 || j < 0 || j >= list.length ? list : swap(list, i, j);
        });

    return {
        pictograms,
        add: icon =>
            update(list => [...list, { id: uuid(), img: icon.img, text: icon.text }]),
        remove: id => update(list => list.filter(p => p.id !== id)),
        moveUp: id => move(id, -1),
        moveDown: id => move(id, +1),
        clear: () => update(() => []),
    };
}
