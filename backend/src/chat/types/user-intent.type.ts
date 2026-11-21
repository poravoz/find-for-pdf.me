
export type UserIntent = {
    intent:
        | 'chat'
        | 'create_file'
        | 'rag'
        | 'generate_image'
        | 'chat_history'
        | 'web_search';

    format: string | null;
    description: string;

    sources: {
        documents: boolean;
        web: boolean;
    };

    searchQuery: string | null;
};
