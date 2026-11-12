import { useState, useEffect } from "react";

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
        } catch {
            // Storage full or blocked; the in-memory state still works.
        }
    }, [key, value]);

    return [value, setValue];
}
