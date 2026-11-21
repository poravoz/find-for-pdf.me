export const VECTOR_STORE_CONFIG = {
    TABLE_NAME: 'documents',
    DISTANCE_STRATEGY: 'cosine' as const,

    COLUMNS: {
        ID: 'id',
        VECTOR: 'vector',
        CONTENT: 'content',
        METADATA: 'metadata',
    },

    MIN_RELEVANCE_SCORE: 0.7,
    RETRIEVAL_TOP_K: 5,
};
