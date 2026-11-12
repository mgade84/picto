import { createContext, useContext } from "react";

// Split into read and update contexts so components that only open the
// drawer (TopBar) don't re-render when it toggles.
export const DrawerContext = createContext(false);
export const DrawerUpdateContext = createContext(() => {});

export function useDrawer() {
    return useContext(DrawerContext);
}

export function useDrawerUpdate() {
    return useContext(DrawerUpdateContext);
}
