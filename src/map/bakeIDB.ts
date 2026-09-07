/* Save the tiles currently on screen as a picture pinned to their coordinates,
   so the table shows a map even with no connection at all.

   That image is a JPEG of a few megabytes and used to live in localStorage —
   the same 5 MB that the contributions need to fit in. Whoever pressed "Save
   map offline" in the morning would then see every contribution silently fail
   to save. It now goes to IndexedDB, which has its own, much larger quota. */
const BAKE_DB = "pucktable",
    BAKE_STORE = "basemap";

export function bakeIDB<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    return new Promise((resolve, reject) => {
        if (!self.indexedDB) return reject(new Error("geen IndexedDB"));
        const req = indexedDB.open(BAKE_DB, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(BAKE_STORE))
                req.result.createObjectStore(BAKE_STORE);
        };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
            const db = req.result;
            let op: IDBRequest<T>;
            try {
                op = run(
                    db.transaction(BAKE_STORE, mode).objectStore(BAKE_STORE),
                );
            } catch (err) {
                db.close();
                return reject(err);
            }
            op.onsuccess = () => {
                resolve(op.result);
                db.close();
            };
            op.onerror = () => {
                reject(op.error);
                db.close();
            };
        };
    });
}
