
export interface PdfImage {
    imagePrompt: string;
    position: number;
  }
  
  export interface PdfTable {
    title: string;
    position: number;
    headers: string[];
    rows: string[][];
  }
  
  export interface PdfDocumentData {
    fileName: string;
    content: string;
    images: PdfImage[];
    tables: PdfTable[];
  }
  
  export interface PdfGeneratedImage {
    position: number;
    imageBuffer: Buffer;
  }
  
  export interface PdfContentItem {
    position: number;
    type: 'text' | 'image' | 'table';
    content: string;
  }
  