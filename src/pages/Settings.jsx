import { useState } from "react";
import { Button, Typography } from "@mui/material";
import PictogramBase from "../components/PictogramBase";
import usePictograms from "../hooks/usePictograms";

export default function Settings() {
    const { pictograms, clear } = usePictograms();
    const [cleared, setCleared] = useState(false);

    const handleClear = () => {
        if (window.confirm(`Delete all ${pictograms.length} pictograms?`)) {
            clear();
            setCleared(true);
        }
    };

    return (
        <PictogramBase>
            <Typography variant="h4" component="h1" gutterBottom>
                Settings
            </Typography>

            <Typography variant="h5" component="h2" gutterBottom>
                Danger zone
            </Typography>
            <Typography component="div">
                Delete all pictograms ({pictograms.length}){" "}
                <Button
                    variant="contained"
                    color="error"
                    disabled={pictograms.length === 0}
                    onClick={handleClear}
                >
                    Clear
                </Button>
            </Typography>
            {cleared && <Typography sx={{ mt: 1 }}>All pictograms deleted.</Typography>}
        </PictogramBase>
    );
}
