import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App";

// Picto is used mostly on phones: every button is at least 44px, Apple's
// minimum touch target (MUI's defaults are 37-40px).
const theme = createTheme({
    components: {
        MuiIconButton: { styleOverrides: { sizeMedium: { padding: 10 } } },
        MuiButton: { styleOverrides: { root: { minHeight: 44 } } },
        MuiToggleButton: { styleOverrides: { root: { minHeight: 44 } } },
    },
});

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </ThemeProvider>
    </StrictMode>
);
