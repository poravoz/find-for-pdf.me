declare module 'chartsheet' {
    export function addChart(
        buffer: Buffer,
        options: Record<string, any>,
    ): Promise<Buffer>;
}
