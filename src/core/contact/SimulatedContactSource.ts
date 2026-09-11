import { ContactSource } from "./ContactSource";
import { SIM_CONTACT_ID_BLOCK } from "./constants";
import type { SensedContact } from "./SensedContact";

/* The drag copies from the tray: pucks that exist on screen but not on
   the glass.
 *
 * A copy is set as a whole — all of its feet at once — because that is
 * what it is. Setting them one at a time would reintroduce exactly the
 * half-seen object that polling was chosen to avoid.
 *
 * Ids are synthesised as `uid * SIM_CONTACT_ID_BLOCK + index`, so two
 * copies can never share a contact id and a simulated foot can never
 * be mistaken for a real touch. Feet from two different copies must
 * never form one puck together, and distinct id blocks are what makes
 * that checkable above rather than assumed here.
 */
export class SimulatedContactSource extends ContactSource {
    readonly #copies = new Map<number, SensedContact[]>();

    setCopy(
        uid: number,
        feet: readonly { x: number; y: number }[],
        radiusPX: number,
        at: number,
    ): void {
        const was = this.#copies.get(uid);
        const points = feet.map((foot, index): SensedContact => {
            const id = uid * SIM_CONTACT_ID_BLOCK + index;
            const before = was?.[index];
            return {
                id,
                x: foot.x,
                y: foot.y,
                radiusPX,
                firstSeen: before?.firstSeen ?? at,
                lastSeen: at,
            };
        });
        this.#copies.set(uid, points);
    }

    removeCopy(uid: number): void {
        this.#copies.delete(uid);
    }

    protected override live(): readonly SensedContact[] {
        const points: SensedContact[] = [];
        for (const copy of this.#copies.values()) points.push(...copy);
        points.sort((a, b) => a.id - b.id);
        return points;
    }

    protected override clearLive(): void {
        this.#copies.clear();
    }
}
