import { useMemo } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import {
    DEFAULT_PREFERENCES,
    PREFERENCE_OPTIONS,
    PREFERENCES_KEY,
    PreferencesContext,
} from "./preferencesContext";

// Keeps only known preferences with allowed values; the rest fall back to
// their defaults rather than trusting whatever is in storage.
function validate(stored) {
    return Object.fromEntries(
        Object.entries(PREFERENCE_OPTIONS).map(([name, options]) => [
            name,
            options.includes(stored?.[name]) ? stored[name] : DEFAULT_PREFERENCES[name],
        ])
    );
}

export default function PreferencesProvider({ children }) {
    const [stored, setStored] = useLocalStorage(PREFERENCES_KEY, DEFAULT_PREFERENCES);

    const value = useMemo(
        () => ({
            ...validate(stored),
            setPreference: (name, v) => setStored(prev => ({ ...validate(prev), [name]: v })),
        }),
        [stored, setStored]
    );
    return <PreferencesContext value={value}>{children}</PreferencesContext>;
}
