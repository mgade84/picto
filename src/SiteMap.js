export const AppName = "Picto";

// Injected by Vite from package.json (see vite.config.js).
export const AppVersion = __APP_VERSION__;

export const Pages = {
    home: "/",
    sequence: "/sequence/:id",
    print: "/sequence/:id/print",
    importLink: "/import",
    about: "/about",
    settings: "/settings",
};

export function sequencePath(id) {
    return `/sequence/${encodeURIComponent(id)}`;
}

export function printPath(id) {
    return `${sequencePath(id)}/print`;
}
