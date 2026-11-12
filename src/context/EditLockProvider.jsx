import { useMemo } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import { EditLockContext, LOCK_KEY } from "./editLockContext";

export default function EditLockProvider({ children }) {
    const [stored, setLocked] = useLocalStorage(LOCK_KEY, false);
    const locked = stored === true;

    const value = useMemo(
        () => ({ locked, toggle: () => setLocked(l => l !== true) }),
        [locked, setLocked]
    );
    return <EditLockContext value={value}>{children}</EditLockContext>;
}
