export interface GeneratedFileContent {
    fileName: string;
    content: string;

    images?: {
        imagePrompt: string;
        position: number;
    }[];

    tables?: {
        title: string;
        position: number;
        headers: string[];
        rows: string[][];
    }[];
}
