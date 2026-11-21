import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { CHUNK_OVERLAP, CHUNK_SIZE } from '../constants/chat.constants';

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    separators: ['\n\n', '\n', ' ', ''],
});

export function splitDocuments(docs: Document[]): Promise<Document[]> {
    return splitter.splitDocuments(docs);
}
