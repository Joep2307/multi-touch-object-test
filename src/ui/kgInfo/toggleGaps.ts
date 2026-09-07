import { kgUrl } from "../../config/kgUrl";
import { ensureKG } from "../../kg/ensureKG";
import { kg } from "../../kg/kg";
import { markLayerMenu } from "../menu/markLayerMenu";

export async function toggleGaps(): Promise<void> {
    kg.gaps = !kg.gaps;
    markLayerMenu();
    if (kg.gaps && !kg.loaded) await ensureKG(kgUrl());
}
