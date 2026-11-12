import { useEffect, useMemo } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import { LANGUAGE_KEY, LanguageContext } from "./languageContext";
import { DEFAULT_LANGUAGE, LANGUAGES } from "./strings";

export default function LanguageProvider({ children }) {
    const [stored, setLanguage] = useLocalStorage(LANGUAGE_KEY, DEFAULT_LANGUAGE);
    const language = LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE;

    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
    return <LanguageContext value={value}>{children}</LanguageContext>;
}
