/* The element at `i`, or a failure naming the index that was missing.
 *
 * `noUncheckedIndexedAccess` holds for the tests too, and rightly: a
 * test that reads `list[3]` is asserting there is a fourth element. This
 * is that assertion written down. It fails where the assumption is made,
 * with the index and the length in the message, instead of three lines
 * later as "cannot read property of undefined" — which is the same bug
 * reported from the wrong place. */
export function at<T>(list: ArrayLike<T>, i: number): T {
    const value = list[i];
    if (value === undefined) {
        throw new Error(`no element ${i} in a list of ${list.length}`);
    }
    return value;
}
