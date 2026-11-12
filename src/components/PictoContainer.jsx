import { Stack } from "@mui/material";
import Pictogram from "./Pictogram";
import PictoAdder from "./PictoAdder";
import usePictograms from "../hooks/usePictograms";

export default function PictoContainer() {
    const { pictograms, add, remove, moveUp, moveDown } = usePictograms();

    return (
        <Stack sx={{ alignItems: "center", pb: 4 }}>
            {pictograms.map(p => (
                <Pictogram
                    key={p.id}
                    data={p}
                    onDelete={remove}
                    onDown={moveDown}
                    onUp={moveUp}
                />
            ))}
            <PictoAdder onAdd={add} />
        </Stack>
    );
}
