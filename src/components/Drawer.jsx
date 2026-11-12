import {
    Box,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    SwipeableDrawer,
    Typography,
} from "@mui/material";
import CollectionsIcon from "@mui/icons-material/Collections";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoIcon from "@mui/icons-material/Info";
import { Link } from "react-router";
import { useDrawer, useDrawerUpdate } from "../context/drawerContext";
import { AppName, Pages } from "../SiteMap";
import logoUrl from "../logo.svg";

function MenuItem({ icon, text, to }) {
    return (
        <ListItem disablePadding>
            <ListItemButton component={Link} to={to}>
                <ListItemIcon>{icon}</ListItemIcon>
                <ListItemText primary={text} />
            </ListItemButton>
        </ListItem>
    );
}

export default function Drawer() {
    const isOpen = useDrawer();
    const setOpen = useDrawerUpdate();

    const toggleDrawer = open => event => {
        if (
            event?.type === "keydown" &&
            (event.key === "Tab" || event.key === "Shift")
        ) {
            return;
        }
        setOpen(open);
    };

    return (
        <SwipeableDrawer
            open={isOpen}
            onClose={toggleDrawer(false)}
            onOpen={toggleDrawer(true)}
        >
            <Box
                sx={{ width: 250 }}
                role="presentation"
                onClick={toggleDrawer(false)}
                onKeyDown={toggleDrawer(false)}
            >
                <List>
                    <ListItem>
                        <ListItemIcon>
                            <Box
                                component="img"
                                src={logoUrl}
                                alt=""
                                sx={{ width: 50, height: 50 }}
                            />
                        </ListItemIcon>
                        <Typography variant="h5">{AppName}</Typography>
                    </ListItem>
                    <Divider />
                    <MenuItem
                        icon={<CollectionsIcon />}
                        text="My Picto collection"
                        to={Pages.home}
                    />
                </List>
                <Divider />
                <List>
                    <MenuItem icon={<SettingsIcon />} text="Settings" to={Pages.settings} />
                    <MenuItem icon={<InfoIcon />} text="About" to={Pages.about} />
                </List>
            </Box>
        </SwipeableDrawer>
    );
}
