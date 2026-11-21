import { readFile } from 'fs/promises';
import { extname } from 'path';

const IMAGE_MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
};

export async function imageToDataUrl(filePath: string): Promise<string> {
    const mime = IMAGE_MIME_TYPES[extname(filePath).toLowerCase()] ?? 'image/jpeg';
    const base64 = (await readFile(filePath)).toString('base64');

    return `data:${mime};base64,${base64}`;
}