/* Every group of five out of the given point indices, in ascending order.
   Six or seven points on one circle happen when a hand rests next to the
   puck; each five is then tried, so the puck isn't lost. */
export function pick5(idx: number[]): number[][] {
    const a = [...idx].sort((x, y) => x - y);
    if (a.length === 5) return [a];
    const out: number[][] = [],
        cur: number[] = [];
    const walk = (start: number): void => {
        if (cur.length === 5) {
            out.push([...cur]);
            return;
        }
        for (let i = start; i < a.length; i++) {
            cur.push(a[i]);
            walk(i + 1);
            cur.pop();
        }
    };
    walk(0);
    return out;
}
