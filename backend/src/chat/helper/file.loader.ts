import { Document } from '@langchain/core/documents';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { extname } from 'path';
import { loadPdfAsDocuments } from './pdf.loader';

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export const TEXT_EXTENSIONS = ['.txt', '.md', '.json', '.log'];

export const ALLOWED_EXTENSIONS = [
    '.pdf',
    '.docx',
    '.csv',
    ...TEXT_EXTENSIONS,
    ...IMAGE_EXTENSIONS,
];

export function isImage(filePath: string): boolean {
    return IMAGE_EXTENSIONS.includes(extname(filePath).toLowerCase());
}

export async function loadFileAsDocuments(
    filePath: string,
    sourceName?: string,
): Promise<Document[]> {
    const ext = extname(filePath).toLowerCase();
    let docs: Document[];

    if (ext === '.pdf') {
        docs = await loadPdfAsDocuments(filePath);
    } else if (ext === '.docx') {
        docs = await new DocxLoader(filePath).load();
    } else if (ext === '.csv') {
        docs = await new CSVLoader(filePath).load();
    } else if (TEXT_EXTENSIONS.includes(ext)) {
        docs = await new TextLoader(filePath).load();
    } else {
        throw new Error(`Unsupported file type: ${ext}`);
    }

    return docs.map(
        (d) =>
            new Document({
                pageContent: d.pageContent,
                metadata: {
                    ...(d.metadata || {}),
                    source: sourceName ?? filePath,
                },
            }),
    );
}
