import { Route, Routes } from "react-router";
import Drawer from "./components/Drawer";
import StorageWarning from "./components/StorageWarning";
import TopBar from "./components/TopBar";
import CollectionsProvider from "./context/CollectionsProvider";
import DrawerProvider from "./context/DrawerProvider";
import EditLockProvider from "./context/EditLockProvider";
import PreferencesProvider from "./context/PreferencesProvider";
import LanguageProvider from "./i18n/LanguageProvider";
import About from "./pages/About";
import CollectionList from "./pages/CollectionList";
import PrintSequence from "./pages/PrintSequence";
import Sequence from "./pages/Sequence";
import Settings from "./pages/Settings";
import { Pages } from "./SiteMap";

export default function App() {
    return (
        <LanguageProvider>
            <PreferencesProvider>
                <CollectionsProvider>
                    <EditLockProvider>
                        <DrawerProvider>
                            <TopBar />
                            <Drawer />
                        </DrawerProvider>
                        <StorageWarning />
                        <Routes>
                            <Route path={Pages.home} element={<CollectionList />} />
                            <Route path={Pages.sequence} element={<Sequence />} />
                            <Route path={Pages.print} element={<PrintSequence />} />
                            <Route path={Pages.settings} element={<Settings />} />
                            <Route path={Pages.about} element={<About />} />
                            <Route path="*" element={<CollectionList />} />
                        </Routes>
                    </EditLockProvider>
                </CollectionsProvider>
            </PreferencesProvider>
        </LanguageProvider>
    );
}
