import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
    { ignores: ["dist", "node_modules", "coverage"] },
    js.configs.recommended,
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite,
    {
        files: ["**/*.{js,jsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: { ecmaFeatures: { jsx: true } },
            globals: { ...globals.browser, __APP_VERSION__: "readonly" },
        },
        rules: {
            // Without eslint-plugin-react, JSX usage isn't tracked; allow
            // PascalCase identifiers (components) to look unused.
            "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
        },
    },
    {
        files: ["*.config.js", "e2e/**"],
        languageOptions: { globals: globals.node },
    },
    {
        files: ["src/**/*.test.{js,jsx}", "src/test/**"],
        languageOptions: { globals: { ...globals.node } },
    },
];
