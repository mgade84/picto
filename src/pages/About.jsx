import { Divider, Link, Typography } from "@mui/material";
import PictogramBase from "../components/PictogramBase";
import { useT } from "../i18n/languageContext";
import { AppVersion } from "../SiteMap";

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
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ mb: 2 }}>{t("about.createdBy")}</Typography>
            <Typography color="text.secondary">
                {t("about.version", { version: AppVersion })}
            </Typography>
        </PictogramBase>
    );
}
