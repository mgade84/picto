# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Picto is a static React SPA for building visual schedules (ordered lists of pictograms). See README.md for what the app does from the user's side. Stack: Vite, React 19, MUI 9 (styling via `sx`, no `makeStyles`), React Router 8 (declarative `<Routes>`), Vitest + Testing Library.

## Commands

**Never install anything on the host or run `npm`/`node`/`npx` there.** All tooling runs in Docker:

```
docker compose up dev                                   # Vite dev server, http://localhost:3000 (runs npm install first)
docker compose run --rm dev npm test                    # all tests, once
docker compose run --rm dev npx vitest run -t "reorders"  # single test by name
docker compose run --rm dev npm run lint
docker compose run --rm dev npm run build
docker compose up --build app                           # prod nginx image, http://localhost:8090
```
Host ports default to 3000 (dev) and 8090 (app); 5173 and 8080 are used by other projects on this machine; override them with `PICTO_DEV_PORT` and `PICTO_PORT`. When checking that a port serves Picto, look for `<title>Picto</title>`: other Vite apps also serve `/src/main.jsx`. `node_modules` is a named volume; the `dev` stage of the `Dockerfile` pre-creates it owned by uid 1000 so files written to the bind mount (such as `package-lock.json`) stay user-owned.

## Architecture

- **No backend.** Search calls the public, CORS-enabled ARASAAC API directly from the browser (`src/hooks/useArasaacSearch.js`). The API answers **404 with `[]`** when nothing matches, which is treated as "no results". Image URLs are built from the pictogram id (`static.arasaac.org/pictograms/{id}/{id}_{res}.png`).
- **Routes** (`src/SiteMap.js`): `/` is the collections list (`pages/CollectionList.jsx`), `/sequence/:id` is one sequence (`pages/Sequence.jsx`), plus `/settings` and `/about`. Unknown paths render the list.
- **Persistence:** `CollectionsProvider` (`src/context/`, wrapped around the whole app) is the single source of truth, read via `useCollections()`. It stores `localStorage["collections"]` as `{ collections: [{ id, name, pictograms: [{ id, img, text }] }] }`. On first load, if that key is empty, the pre-0.3 single schedule in `localStorage["pictograms"]` (also the v0.1 Flaticon-era format) is migrated into a sequence named "My sequence". The legacy key is left untouched. Tests cover the migration. All ids are uuids; pictogram ids are not ARASAAC ids, so the same pictogram can appear twice.
- **Dialogs:** MUI `Dialog` unmounts its children when closed, so form state lives in an inner component to reset on reopen (`NameDialog`, `PictoAdder`). While a dialog is closing, the page behind it is `aria-hidden`, so tests must wait for the dialog to disappear before querying by role.
- **i18n:** a small homegrown layer in `src/i18n/`. Every UI string lives in `strings.js` (`da` and `en`, with `{param}` placeholders; plurals are functions). Components call `const t = useT()`; never hard-code UI text. The language is stored in `localStorage["language"]` and defaults to `"da"`. `LanguageProvider` sits outside `CollectionsProvider`, so the migrated sequence gets a localized name.
- **Search locales:** `SEARCH_LOCALES` in `strings.js` maps the UI language to the ARASAAC locales tried in order. ARASAAC *accepts* `da` but has no Danish keywords (every search is empty, verified 2026-11), so Danish searches `nb` and then `en`. `useArasaacSearch(query, locales)` returns the `locale` that produced results. The fallback makes the browser log a 404 for the first locale; that's ARASAAC's normal "no matches" answer.
- **Tests fail on `console.error`** (`src/test/setup.js`), which catches invalid-prop warnings, such as props removed in MUI 9 like `Typography paragraph`. Tests pin English via `renderApp(path, { language })`; pass `{ language: null }` to exercise the Danish default.
- **Context file split:** contexts and hooks live in lower-case `*Context.js` files and providers in `*Provider.jsx`, because `react-refresh/only-export-components` forbids mixing them.
- **App version:** injected from `package.json` as the `__APP_VERSION__` global via `define` in `vite.config.js`, and re-exported as `AppVersion` from `src/SiteMap.js`.
- **Lint rules that bite:** `react-hooks/set-state-in-effect` forbids synchronous `setState` in effect bodies. That's why `useArasaacSearch` derives `loading` from a result tagged with its request key.
- **Licensing:** ARASAAC pictograms are CC BY-NC-SA. Keep the attribution on the About page.
