export function isAbortError(error: unknown): boolean {
    if (error instanceof Error && error.name === 'AbortError') {
        return true;
    }

    if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error
    ) {
        return error.name === 'AbortError';
    }

    return false;
}
