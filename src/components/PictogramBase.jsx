import { Paper } from "@mui/material";

export default function PictogramBase({ children }) {
    return (
        <Paper
            elevation={5}
            sx={{ m: "10px", p: "20px", border: "2px solid" }}
        >
            {children}
        </Paper>
    );
}
