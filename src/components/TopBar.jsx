import { AppBar, IconButton, Toolbar, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useDrawerUpdate } from "../context/drawerContext";
import { useT } from "../i18n/languageContext";
import { AppName } from "../SiteMap";

export default function TopBar() {
    const t = useT();
    const setOpenDrawer = useDrawerUpdate();

    return (
        <AppBar position="sticky">
            <Toolbar>
                <IconButton
                    edge="start"
                    color="inherit"
                    aria-label={t("menu.open")}
                    sx={{ mr: 2 }}
                    onClick={() => setOpenDrawer(true)}
                >
                    <MenuIcon />
                </IconButton>
                <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
                    {AppName}
                </Typography>
            </Toolbar>
        </AppBar>
    );
}
