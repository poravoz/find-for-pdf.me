import { Document } from '@langchain/core/documents';
import { MAX_SOURCES } from '../constants/chat.constants';

export type VectorScore = number | { distance: number; similarity: number };

export const toSimilarity = (score: VectorScore): number =>
    typeof score === 'number' ? 1 - score : score.similarity;

export function filterRelevantDocuments(
    docs: Document[],
    scores: number[],
    minScore: number,
): Document[] {
    return docs.filter((_, index) => scores[index] >= minScore);
}

export function extractSources(docs: Document[]): string[] {
    return Array.from(
        new Set(
            docs
                .map((d) => d.metadata?.source)
                .filter(Boolean) as string[],
        ),
    ).slice(0, MAX_SOURCES);
}