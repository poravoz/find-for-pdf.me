export interface ChatResponse {
    success: boolean;
    chatId?: string;
    answer: string;
    sources?: string[];
    contextCount?: number;
    mode?:
    | 'rag'
    | 'general'
    | 'file-generation'
    | 'image-generation'
    | 'chat-history'
    | 'web-search'
    fileName?: string;
    downloadUrl?: string;
    imageUrl?: string;
    imageFileName?: string;
    message?: string;
}
