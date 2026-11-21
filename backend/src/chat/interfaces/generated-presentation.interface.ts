export interface GeneratedPresentation {
    fileName: string;
    slides: {
        title: string;
        content: string[];
        imagePrompt?: string;
        table?: {
            headers: string[];
            rows: string[][];
        };
    }[];
}