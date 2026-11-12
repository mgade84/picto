import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));

export default defineConfig({
    plugins: [react()],
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
        port: 5173,
        // File change events don't always propagate into bind-mounted containers.
        watch: { usePolling: true },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./src/test/setup.js"],
        restoreMocks: true,
    },
});
