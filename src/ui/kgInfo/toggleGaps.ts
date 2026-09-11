import { kgUrl } from "../../config";
import { ensureKG, kg } from "../../kg";
import { markLayerMenu } from "../menu";

export async function toggleGaps(): Promise<void> {
    kg.gaps = !kg.gaps;
    markLayerMenu();
    if (kg.gaps && !kg.loaded) await ensureKG(kgUrl());
}
