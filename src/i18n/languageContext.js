import { createContext, useContext } from "react";
import { DEFAULT_LANGUAGE, translate } from "./strings";

// localStorage key holding the chosen UI language ("da" | "en").
export const LANGUAGE_KEY = "language";

export const LanguageContext = createContext({
    language: DEFAULT_LANGUAGE,
    setLanguage: () => {},
});

export function useLanguage() {
    return useContext(LanguageContext);
}

/** Returns t(key, params) bound to the current language. */
export function useT() {
    const { language } = useLanguage();
    return (key, params) => translate(language, key, params);
}
