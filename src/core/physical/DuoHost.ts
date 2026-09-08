import { Puck } from "./Puck";
import type { DuoInsert } from "./DuoInsert";

/* The outer half of the duo: the puck that carries the role and
   accepts another inside it.
 *
 * The host is an ordinary puck in every respect except that something
 * can sit in it. It keeps a reference to what is nested rather than
 * the other way round only, because the question asked at runtime is
 * "what is this puck currently capable of", and that is the host's
 * question.
 */
export class DuoHost extends Puck {
    #insert: DuoInsert | null = null;

    get insert(): DuoInsert | null {
        return this.#insert;
    }

    get hasInsert(): boolean {
        return this.#insert !== null;
    }

    accept(insert: DuoInsert): void {
        this.#insert = insert;
    }

    release(): void {
        this.#insert = null;
    }
}
