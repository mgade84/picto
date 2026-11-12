import { Route, Routes } from "react-router";
import PictoContainer from "./components/PictoContainer";
import Drawer from "./components/Drawer";
import TopBar from "./components/TopBar";
import DrawerProvider from "./context/DrawerProvider";
import About from "./pages/About";
import Settings from "./pages/Settings";
import { Pages } from "./SiteMap";

export default function App() {
    return (
        <>
            <DrawerProvider>
                <TopBar />
                <Drawer />
            </DrawerProvider>
            <Routes>
                <Route path={Pages.home} element={<PictoContainer />} />
                <Route path={Pages.settings} element={<Settings />} />
                <Route path={Pages.about} element={<About />} />
                <Route path="*" element={<PictoContainer />} />
            </Routes>
        </>
    );
}
