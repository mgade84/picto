import { useState } from "react";
import { DrawerContext, DrawerUpdateContext } from "./drawerContext";

export default function DrawerProvider({ children }) {
    const [open, setOpen] = useState(false);

    return (
        <DrawerContext value={open}>
            <DrawerUpdateContext value={setOpen}>{children}</DrawerUpdateContext>
        </DrawerContext>
    );
}
