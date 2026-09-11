export const wait = (ms: number): Promise<void> =>
    new Promise<void>((res) => setTimeout(res, ms));
