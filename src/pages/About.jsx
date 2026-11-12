import { Divider, Link, List, ListItem, Typography } from "@mui/material";
import PictogramBase from "../components/PictogramBase";
import { useCollections } from "../context/collectionsContext";
import { useT } from "../i18n/languageContext";
import { AppVersion } from "../SiteMap";

// Every Wikimedia Commons photo in use, once each, with author and licence
// (several Commons licences require crediting the author).
function PhotoCredits() {
    const t = useT();
    const { collections } = useCollections();
    const credits = new Map();
    for (const c of collections) {
        for (const p of c.pictograms ?? []) {
            if (p.credit?.url && !credits.has(p.credit.url)) credits.set(p.credit.url, p.credit);
        }
    }
    if (credits.size === 0) return null;

    return (
        <>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {t("about.photos")}
            </Typography>
            <List dense disablePadding aria-label={t("about.photos")} sx={{ mb: 2 }}>
                {[...credits.values()].map(c => (
                    <ListItem key={c.url} disableGutters sx={{ py: 0 }}>
                        <Typography variant="body2">
                            <Link href={c.url} target="_blank" rel="noopener">
                                {c.author}
                            </Link>
                            {c.license && `, ${c.license}`}
                        </Typography>
                    </ListItem>
                ))}
            </List>
        </>
    );
}

export default function About() {
    const t = useT();

    return (
        <PictogramBase>
            <Typography variant="h4" component="h1" gutterBottom>
                {t("about.title")}
            </Typography>
            <Typography sx={{ mb: 2 }}>{t("about.intro")}</Typography>
            <Typography sx={{ mb: 2 }}>{t("about.audience")}</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ mb: 2 }}>
                {t("about.attribution.before")}
                <Link href="https://arasaac.org" target="_blank" rel="noopener">
                    ARASAAC
                </Link>
                {t("about.attribution.middle")}
                <Link
                    href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                    target="_blank"
                    rel="noopener"
                >
                    {t("about.attribution.license")}
                </Link>
                {t("about.attribution.after")}
            </Typography>
            <PhotoCredits />
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ mb: 2 }}>{t("about.createdBy")}</Typography>
            <Typography color="text.secondary">
                {t("about.version", { version: AppVersion })}
            </Typography>
        </PictogramBase>
    );
}
