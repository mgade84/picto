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
- **Persistence:** `src/hooks/usePictograms.js` owns the schedule and stores it in `localStorage["pictograms"]` as `{ pictograms: [{ id, img, text }] }`. This shape is shared with v0.1 (Flaticon era) data and must stay backward compatible. A test covers loading old data. Pictogram `id`s are uuids, not ARASAAC ids, so the same pictogram can appear twice.
- **Drawer state:** contexts and hooks live in `src/context/drawerContext.js` and the provider in `DrawerProvider.jsx`. They are split because of `react-refresh/only-export-components`.
- **App version:** injected from `package.json` as the `__APP_VERSION__` global via `define` in `vite.config.js`, and re-exported as `AppVersion` from `src/SiteMap.js`.
- **Lint rules that bite:** `react-hooks/set-state-in-effect` forbids synchronous `setState` in effect bodies. That's why `useArasaacSearch` derives `loading` from a result tagged with its request key.
- **Licensing:** ARASAAC pictograms are CC BY-NC-SA. Keep the attribution on the About page.
