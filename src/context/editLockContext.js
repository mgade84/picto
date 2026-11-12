import { createContext, useContext } from "react";

// localStorage key for whether editing is locked. Persisted so a reload
// doesn't unlock a schedule handed to a child.
export const LOCK_KEY = "editLocked";

export const EditLockContext = createContext({ locked: false, toggle: () => {} });

/** { locked, toggle } — when locked, collections and sequences are read-only. */
export function useEditLock() {
    return useContext(EditLockContext);
}
