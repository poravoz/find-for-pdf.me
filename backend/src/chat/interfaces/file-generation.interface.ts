export interface GeneratedFile {
    buffer: Buffer;
    fileName: string;
    contentType: string;
}

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

export interface ComfyImageInfo {
    filename: string;
    subfolder: string;
    type: string;
}
