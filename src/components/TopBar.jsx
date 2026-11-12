import { AppBar, IconButton, Toolbar, Tooltip, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useDrawerUpdate } from "../context/drawerContext";
import { useEditLock } from "../context/editLockContext";
import { useT } from "../i18n/languageContext";
import { AppName } from "../SiteMap";

function LockButton() {
    const t = useT();
    const { locked, toggle } = useEditLock();

    // A toggle button: a constant name plus aria-pressed, so screen readers
    // announce "Lock editing, pressed/not pressed".
    return (
        <Tooltip title={t(locked ? "lock.tooltipLocked" : "lock.tooltipUnlocked")}>
            <IconButton
                edge="end"
                color="inherit"
                aria-label={t("lock.label")}
                aria-pressed={locked}
                onClick={toggle}
            >
                {locked ? <LockIcon /> : <LockOpenIcon />}
            </IconButton>
        </Tooltip>
    );
}

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
                <LockButton />
            </Toolbar>
        </AppBar>
    );
}
