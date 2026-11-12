import { Divider, Link, Typography } from "@mui/material";
import PictogramBase from "../components/PictogramBase";
import { AppVersion } from "../SiteMap";

export default function About() {
    return (
        <PictogramBase>
            <Typography variant="h4" component="h1" gutterBottom>
                About Picto
            </Typography>
            <Typography paragraph>
                Picto is a small web app for quickly making small sequences of
                pictograms for visual guidance.
            </Typography>
            <Typography paragraph>
                Intended for children (or adults) with (or without) special
                needs.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" paragraph>
                The pictographic symbols used are the property of the Government
                of Aragón and have been created by Sergio Palao for{" "}
                <Link href="https://arasaac.org" target="_blank" rel="noopener">
                    ARASAAC
                </Link>
                , which distributes them under a{" "}
                <Link
                    href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                    target="_blank"
                    rel="noopener"
                >
                    Creative Commons BY-NC-SA
                </Link>{" "}
                license.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography paragraph>Created by Mikkel Gade</Typography>
            <Typography color="text.secondary">Version {AppVersion}</Typography>
        </PictogramBase>
    );
}
