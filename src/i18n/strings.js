// UI strings. "{name}" placeholders are filled in by t(key, params).
// Values may also be functions of params (used for plurals).

export const LANGUAGES = ["da", "en"];
export const DEFAULT_LANGUAGE = "da";

// ARASAAC locales to search, in order, until one returns results.
// ARASAAC accepts "da" but has no Danish keywords, so Danish searches
// Norwegian Bokmål (close to Danish for many words), then English.
export const SEARCH_LOCALES = {
    da: ["nb", "en"],
    en: ["en"],
};

const da = {
    "language.name": "Dansk",
    "language.nb": "norsk",
    "language.en": "engelsk",

    "menu.open": "Åbn menu",
    "menu.collections": "Mine Picto-samlinger",
    "menu.settings": "Indstillinger",
    "menu.about": "Om",

    "list.sequences": "Sekvenser",
    "list.empty": "Ingen sekvenser endnu. Opret en for at begynde at tilføje piktogrammer.",
    "list.new": "Ny sekvens",
    "list.rename": "Omdøb {name}",
    "list.delete": "Slet {name}",
    count: ({ n }) => (n === 1 ? "1 piktogram" : `${n} piktogrammer`),

    "dialog.name": "Navn",
    "dialog.cancel": "Annuller",
    "dialog.create": "Opret",
    "dialog.save": "Gem",
    "dialog.newTitle": "Ny sekvens",
    "dialog.renameTitle": "Omdøb sekvens",
    "dialog.deleteTitle": "Slet sekvens?",
    "dialog.deleteMessage": "»{name}« og dens {count} bliver slettet.",
    "dialog.delete": "Slet",

    "sequence.defaultName": "Sekvens {n}",
    "sequence.migratedName": "Min sekvens",
    "sequence.back": "Tilbage til samlinger",
    "sequence.missing": "Denne sekvens findes ikke længere.",
    "sequence.backLink": "Tilbage til mine samlinger",

    "pictogram.up": "Flyt {label} op",
    "pictogram.down": "Flyt {label} ned",
    "pictogram.delete": "Slet {label}",
    "pictogram.edit": "Ret tekst for {label}",
    "pictogram.label": "Tekst",

    "add.button": "Tilføj piktogram",
    "add.title": "Tilføj et piktogram",
    "add.close": "Luk",
    "add.placeholder": "Søg efter piktogrammer…",
    "add.searchLabel": "Søg efter piktogrammer",
    "add.search": "Søg",
    "add.searching": "Søger",
    "add.failed": "Søgningen mislykkedes: {error}",
    "add.none": "Ingen piktogrammer fundet for »{query}«",
    "add.icon": "Tilføj {text}",
    "add.hint":
        "ARASAAC har endnu ingen danske søgeord, så der søges på norsk og derefter engelsk. Du kan rette teksten på piktogrammet bagefter.",
    "add.resultsIn": "Resultater på {language}",

    "settings.title": "Indstillinger",
    "settings.language": "Sprog / Language",
    "settings.danger": "Farezone",
    "settings.deleteAll": "Slet alle sekvenser ({n})",
    "settings.clear": "Ryd",
    "settings.cleared": "Alle sekvenser er slettet.",
    "settings.confirmTitle": "Slet alt?",
    "settings.confirmMessage": "Alle {n} sekvenser og deres piktogrammer bliver slettet.",
    "settings.confirmButton": "Slet alle",

    "about.title": "Om Picto",
    "about.intro":
        "Picto er en lille webapp til hurtigt at lave korte rækker af piktogrammer som visuel støtte.",
    "about.audience": "Beregnet til børn (eller voksne) med (eller uden) særlige behov.",
    "about.attribution.before":
        "De piktografiske symboler tilhører Aragoniens regering og er skabt af Sergio Palao for ",
    "about.attribution.middle": ", som distribuerer dem under en ",
    "about.attribution.license": "Creative Commons BY-NC-SA",
    "about.attribution.after": "-licens.",
    "about.createdBy": "Lavet af Mikkel Gade",
    "about.version": "Version {version}",
};

const en = {
    "language.name": "English",
    "language.nb": "Norwegian",
    "language.en": "English",

    "menu.open": "Open menu",
    "menu.collections": "My Picto collections",
    "menu.settings": "Settings",
    "menu.about": "About",

    "list.sequences": "Sequences",
    "list.empty": "No sequences yet. Create one to start adding pictograms.",
    "list.new": "New sequence",
    "list.rename": "Rename {name}",
    "list.delete": "Delete {name}",
    count: ({ n }) => (n === 1 ? "1 pictogram" : `${n} pictograms`),

    "dialog.name": "Name",
    "dialog.cancel": "Cancel",
    "dialog.create": "Create",
    "dialog.save": "Save",
    "dialog.newTitle": "New sequence",
    "dialog.renameTitle": "Rename sequence",
    "dialog.deleteTitle": "Delete sequence?",
    "dialog.deleteMessage": "“{name}” and its {count} will be deleted.",
    "dialog.delete": "Delete",

    "sequence.defaultName": "Sequence {n}",
    "sequence.migratedName": "My sequence",
    "sequence.back": "Back to collections",
    "sequence.missing": "This sequence doesn’t exist any more.",
    "sequence.backLink": "Back to my collections",

    "pictogram.up": "Move {label} up",
    "pictogram.down": "Move {label} down",
    "pictogram.delete": "Delete {label}",
    "pictogram.edit": "Edit label of {label}",
    "pictogram.label": "Label",

    "add.button": "Add pictogram",
    "add.title": "Add a pictogram",
    "add.close": "Close",
    "add.placeholder": "Search pictograms…",
    "add.searchLabel": "Search pictograms",
    "add.search": "Search",
    "add.searching": "Searching",
    "add.failed": "Search failed: {error}",
    "add.none": "No pictograms found for “{query}”",
    "add.icon": "Add {text}",
    "add.hint": "",
    "add.resultsIn": "Results in {language}",

    "settings.title": "Settings",
    "settings.language": "Language / Sprog",
    "settings.danger": "Danger zone",
    "settings.deleteAll": "Delete all sequences ({n})",
    "settings.clear": "Clear",
    "settings.cleared": "All sequences deleted.",
    "settings.confirmTitle": "Delete everything?",
    "settings.confirmMessage": "All {n} sequences and their pictograms will be deleted.",
    "settings.confirmButton": "Delete all",

    "about.title": "About Picto",
    "about.intro":
        "Picto is a small web app for quickly making small sequences of pictograms for visual guidance.",
    "about.audience": "Intended for children (or adults) with (or without) special needs.",
    "about.attribution.before":
        "The pictographic symbols used are the property of the Government of Aragón and have been created by Sergio Palao for ",
    "about.attribution.middle": ", which distributes them under a ",
    "about.attribution.license": "Creative Commons BY-NC-SA",
    "about.attribution.after": " license.",
    "about.createdBy": "Created by Mikkel Gade",
    "about.version": "Version {version}",
};

export const STRINGS = { da, en };

export function translate(language, key, params = {}) {
    const value = STRINGS[language]?.[key] ?? STRINGS.en[key];
    if (value === undefined) return key;
    if (typeof value === "function") return value(params);
    return value.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}
