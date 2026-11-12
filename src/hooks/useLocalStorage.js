import { useState, useEffect } from "react";

// Dispatched on window when a value can't be saved (storage full or blocked
// by the browser). <StorageWarning> listens and tells the user, because the
// app otherwise keeps working from memory and the change would silently be
// gone after a reload.
export const STORAGE_ERROR_EVENT = "picto:storage-error";

function getSavedValue(key, initialValue) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        if (value) return value;
    } catch {
        // Corrupt or inaccessible storage: fall back to the initial value.
    }
    return initialValue instanceof Function ? initialValue() : initialValue;
}

export default function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(() => getSavedValue(key, initialValue));

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail: { key, error } }));
        }
    }, [key, value]);

    return [value, setValue];
}
