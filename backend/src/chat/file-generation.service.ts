import { Injectable, BadRequestException } from '@nestjs/common';
import {
    Document,
    Packer,
    Paragraph,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    TextRun,
} from 'docx';
import ExcelJS from 'exceljs';
import pptxgen from 'pptxgenjs';
import { stringify } from 'csv-stringify/sync';
import { ImageGenerationService } from './image-generation.service';
import { FILE_CONTENT_TYPES } from './constants/file-generation.constants';
import { GeneratedFile } from './interfaces/file-generation.interface';
import { PdfDocumentData, PdfGeneratedImage } from './interfaces/pdf-generation.interface';
import { PdfGenerationService } from './pdf-generation.service';

@Injectable()
export class FileGenerationService {
  constructor(
    private readonly imageGenerationService: ImageGenerationService,
    private readonly pdfGenerationService: PdfGenerationService,
) {}

  async generateFile(
    format: string,
    content: string,
    fileName: string,
  ): Promise<GeneratedFile> {
    const name = this.getFileName(fileName);
    const fileFormat = format.toLowerCase();

    switch (fileFormat) {
        case 'txt':
            return this.createGeneratedFile(
                this.generateTxt(content),
                name,
                FILE_CONTENT_TYPES.TXT,
                'txt',
            );

        case 'docx':
            return this.createGeneratedFile(
                await this.generateDocx(content),
                name,
                FILE_CONTENT_TYPES.DOCX,
                'docx',
            );

        case 'pdf':
            return this.createGeneratedFile(
                await this.generatePdf(content),
                name,
                FILE_CONTENT_TYPES.PDF,
                'pdf',
            );

        case 'xlsx':
            return this.createGeneratedFile(
                await this.generateXlsx(content),
                name,
                FILE_CONTENT_TYPES.XLSX,
                'xlsx',
            );

        case 'csv':
            return this.createGeneratedFile(
                this.generateCsv(content),
                name,
                FILE_CONTENT_TYPES.CSV,
                'csv',
            );

        case 'pptx':
            return this.createGeneratedFile(
                await this.generatePptx(content),
                name,
                FILE_CONTENT_TYPES.PPTX,
                'pptx',
            );

        case 'svg':
            return this.createGeneratedFile(
                this.generateSvg(content),
                name,
                FILE_CONTENT_TYPES.SVG,
                'svg',
            );

        default:
            throw new BadRequestException('Unsupported file format');
    }
  }

  private generateTxt(content: string): Buffer {
    return Buffer.from(content, 'utf-8');
  }

  
private async generateDocx(content: string): Promise<Buffer> {
    const fileData = JSON.parse(content);

    const children: (Paragraph | Table)[] = [];

    const lines = fileData.content.split('\n');

    for (const line of lines) {
        children.push(new Paragraph(line));
    }

    for (const tableData of fileData.tables || []) {
        const table = new Table({
            width: {
                size: 100,
                type: WidthType.PERCENTAGE,
            },
            rows: [
                new TableRow({
                    children: tableData.headers.map((header: string) =>
                        new TableCell({
                            shading: {
                                fill: '1F3A5F',
                            },
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: header,
                                            bold: true,
                                            color: 'FFFFFF',
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ),
                }),
                ...tableData.rows.map((row: string[]) =>
                    new TableRow({
                        children: row.map((cell: string) =>
                            new TableCell({
                                children: [
                                    new Paragraph(String(cell)),
                                ],
                            }),
                        ),
                    }),
                ),
            ],
        });

        children.push(table);
    }

    for (const image of fileData.images || []) {
        const generatedImage =
            await this.imageGenerationService.generateImage(
                image.imagePrompt,
            );

        children.splice(
            image.position,
            0,
            new Paragraph({
                children: [
                    new ImageRun({
                        data: generatedImage.imageBuffer,
                        transformation: {
                            width: 400,
                            height: 300,
                        },
                        type: 'png',
                    }),
                ],
            }),
        );
    }

    const document = new Document({
        sections: [
            {
                children,
            },
        ],
    });

    return Packer.toBuffer(document);
}

  
  private async generatePdf(content: string): Promise<Buffer> {
    const document: PdfDocumentData = JSON.parse(content);

    const generatedImages: PdfGeneratedImage[] = [];

    for (const image of document.images || []) {
      const generatedImage =
        await this.imageGenerationService.generateImage(
          image.imagePrompt,
        );

      generatedImages.push({
        position: image.position,
        imageBuffer: generatedImage.imageBuffer,
      });
    }

    return this.pdfGenerationService.generatePdf(
      document,
      generatedImages,
    );
  }

  private async generateXlsx(content: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    const rows = content.split('\n');

    for (const row of rows) {
        worksheet.addRow(row.split(','));
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(buffer);
  }

  private generateCsv(content: string): Buffer {
    const rows = content
        .split('\n')
        .map((row) => row.split(','));

    const csvContent = stringify(rows);

    return Buffer.from(csvContent, 'utf-8');
  }

 
private async generatePptx(content: string): Promise<Buffer> {
    try {
        const presentationData = JSON.parse(content);

        if (!Array.isArray(presentationData.slides)) {
            throw new Error('Presentation slides must be an array');
        }

        const presentation = new pptxgen();

        presentation.layout = 'LAYOUT_WIDE';
        presentation.author = 'AI Studio';
        presentation.subject = 'Generated presentation';
        presentation.title = presentationData.fileName || 'Presentation';

        presentation.theme = {
            headFontFace: 'Arial',
            bodyFontFace: 'Arial',
        };

        for (const [index, slideData] of presentationData.slides.entries()) {

            if (!slideData || typeof slideData !== 'object' || !Array.isArray(slideData.content)) {
                throw new Error(`Invalid slide structure at index ${index}`);
            }

            const firstContentItem = slideData.content.find(
                (item: unknown) => typeof item === 'string' && item.trim(),
            );

            const contentBasedTitle =
                typeof firstContentItem === 'string'
                    ? firstContentItem
                          .replace(/^[•\-*\d.)\s]+/, '')
                          .split(/[.!?\n]/)[0]
                          .trim()
                    : '';

            const slideTitle =
                typeof slideData.title === 'string' && slideData.title.trim()
                    ? slideData.title.trim()
                    : contentBasedTitle
                          ? contentBasedTitle.slice(0, 60)
                          : `Untitled slide ${index + 1}`;

            if (slideTitle !== slideData.title) {
                console.warn(
                    `[PPTX] Missing slide title at index ${index}; using content-based fallback "${slideTitle}"`,
                );
            }

            const slide = presentation.addSlide();

            slide.background = {
                color: 'F4F6FA',
            };

            slide.addText(slideTitle, {
                x: 0.6,
                y: 0.4,
                w: 12,
                h: 0.8,
                fontFace: 'Arial',
                fontSize: 28,
                bold: true,
                color: '1F3A5F',
            });

            const hasTable =
                slideData.table &&
                Array.isArray(slideData.table.headers) &&
                Array.isArray(slideData.table.rows) &&
                slideData.table.headers.length > 0 &&
                slideData.table.rows.length > 0 &&
                slideData.table.rows.every(
                    (row: string[]) =>
                        Array.isArray(row) &&
                        row.length === slideData.table.headers.length,
                );
        
            const hasImage = Boolean(slideData.imagePrompt);
        
            let contentOptions: any;
        
            if (hasTable && hasImage) {
                contentOptions = {
                    x: 0.8,
                    y: 1.5,
                    w: 5.8,
                    h: 1.8,
                };
            } else if (hasTable) {
                contentOptions = {
                    x: 0.8,
                    y: 1.5,
                    w: 11.5,
                    h: 1.5,
                };
            } else if (hasImage) {
                contentOptions = {
                    x: 0.8,
                    y: 1.8,
                    w: 5.8,
                    h: 4.8,
                };
            } else {
                contentOptions = {
                    x: 0.8,
                    y: 1.8,
                    w: 11.5,
                    h: 4.8,
                };
            }
        
            const slideContent = slideData.content
                .map((item: string) => `• ${item}`)
                .join('\n');
        
            slide.addText(slideContent, {
                ...contentOptions,
                fontFace: 'Arial',
                fontSize: 18,
                color: '333333',
                paraSpaceAfter: 12,
                valign: 'top',
                breakLine: false,
            });
        
            if (hasTable) {
                const tableRows = [
                    slideData.table.headers.map((header: string) => ({
                        text: String(header),
                        options: {
                            bold: true,
                            color: 'FFFFFF',
                            fill: '1F3A5F',
                        },
                    })),
                    ...slideData.table.rows.map((row: string[]) =>
                        row.map((cell: string) => ({
                            text: String(cell),
                            options: {
                                color: '333333',
                                fill: 'FFFFFF',
                            },
                        })),
                    ),
                ];
        
                slide.addTable(tableRows, {
                    x: 0.8,
                    y: hasImage ? 3.8 : 3.3,
                    w: 11.5,
                    h: hasImage ? 2.5 : 3.0,
                    colW: Array(slideData.table.headers.length).fill(
                        11.5 / slideData.table.headers.length,
                    ),
                    border: {
                        type: 'solid',
                        color: 'D1D5DB',
                        pt: 1,
                    },
                    fontFace: 'Arial',
                    fontSize: 13,
                    color: '333333',
                    margin: 0.08,
                    valign: 'middle',
                    align: 'center',
                });
            }
        
            if (hasImage) {

                const generatedImage =
                    await this.imageGenerationService.generateImage(
                        slideData.imagePrompt,
                    );
        
                slide.addImage({
                    data: `image/png;base64,${generatedImage.imageBuffer.toString('base64')}`,
                    x: 7.0,
                    y: 1.5,
                    w: 5.5,
                    h: hasTable ? 2.2 : 4.8,
                });
            }
        }

        const buffer = await presentation.write({
            outputType: 'nodebuffer',
        });

        return Buffer.from(buffer as ArrayBuffer);

    } catch (error) {
        console.error('[PPTX] Generation failed:', error);
        throw error;
    }
}

    private generateSvg(content: string): Buffer {
        return Buffer.from(content, 'utf-8');
    }

    private getFileName(fileName?: string): string {
        if (!fileName || typeof fileName !== 'string') {
            return 'generated-file';
        }

        const safeName = (fileName || 'generated-file')
        .replace(/\.(pptx|docx|pdf|xlsx|csv|txt|svg)$/i, '')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .trim()
        .slice(0, 100);

        return safeName || 'generated-file';
    }

  private createGeneratedFile(
      buffer: Buffer,
      name: string,
      contentType: string,
      format: string,
  ): GeneratedFile {
      return {
          buffer,
          fileName: `${name}.${format}`,
          contentType,
      };
  }
}
