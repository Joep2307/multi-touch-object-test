/* The URL's search parameters — the only place where a second setup can
   override anything (?dev, ?diag=55, ?tol=0.08, ?kg=…, ?stt=…). */
export const QS: URLSearchParams = (() => {
    try {
        return new URLSearchParams(location.search);
    } catch (e) {
        return new URLSearchParams("");
    }
})();
