import {
    AffordanceSubject,
    DistanceSubject,
    KindSubject,
    ModeSubject,
    PropertySubject,
    RegionSubject,
    RelationSubject,
    RoleSubject,
    StateSubject,
    VariableSubject,
} from "./subjects";
import type { ConditionSubject } from "./ConditionSubject";

/* Everything a condition can look at, by name.
 *
 * A registry rather than a switch, so that a programme with a subject
 * the core never imagined registers one and every operator works on it
 * the same day. Refuses a duplicate rather than overwriting: two
 * subjects under one name means the answer depends on load order,
 * which is the kind of bug that only shows up on someone else's
 * machine.
 */
export class ConditionRegistry {
    readonly #subjects = new Map<string, ConditionSubject>();

    constructor(subjects: readonly ConditionSubject[] = defaultSubjects()) {
        for (const subject of subjects) this.register(subject);
    }

    register(subject: ConditionSubject): void {
        if (this.#subjects.has(subject.id)) {
            throw new Error(
                `A condition subject called "${subject.id}" is already ` +
                    `registered.`,
            );
        }
        this.#subjects.set(subject.id, subject);
    }

    get(id: string): ConditionSubject | null {
        return this.#subjects.get(id) ?? null;
    }
}

function defaultSubjects(): readonly ConditionSubject[] {
    return [
        new KindSubject(),
        new RoleSubject(),
        new StateSubject(),
        new ModeSubject(),
        new VariableSubject(),
        new DistanceSubject(),
        new RelationSubject(),
        new AffordanceSubject(),
        new RegionSubject(),
        new PropertySubject(),
    ];
}
