import { createContext, useContext } from "react";

// localStorage key for display preferences.
export const PREFERENCES_KEY = "preferences";
export const BIN_SIDES = ["left", "right"];
export const PRINT_ORIENTATIONS = ["landscape", "portrait"];
export const PRINT_DIRECTIONS = ["horizontal", "vertical"];

// Allowed values per preference; the first one is the default.
export const PREFERENCE_OPTIONS = {
    binSide: BIN_SIDES,
    printOrientation: PRINT_ORIENTATIONS,
    printTitle: [true, false],
    printWrap: [false, true],
    // Which way the sequence reads: rows left to right, or columns top to bottom.
    printDirection: PRINT_DIRECTIONS,
    // Pictograms per row (horizontal) or column (vertical); null = automatic.
    printPerLine: [null, ...Array.from({ length: 12 }, (_, i) => i + 1)],
};
export const DEFAULT_PREFERENCES = Object.fromEntries(
    Object.entries(PREFERENCE_OPTIONS).map(([name, options]) => [name, options[0]])
);

export const PreferencesContext = createContext({
    ...DEFAULT_PREFERENCES,
    setPreference: () => {},
});

/** Display preferences plus setPreference(name, value). */
export function usePreferences() {
    return useContext(PreferencesContext);
}
