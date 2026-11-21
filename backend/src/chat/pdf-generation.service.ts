
import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';
import { PDF_GENERATION_CONFIG } from './config/pdf-generation.config';
import {
  PdfDocumentData,
  PdfGeneratedImage,
} from './interfaces/pdf-generation.interface';
import { getPdfTemplate } from './templates/pdf.template';
import { PdfHtmlUtil } from './utils/pdf-html.util';

@Injectable()
export class PdfGenerationService {
  async generatePdf(
    document: PdfDocumentData,
    generatedImages: PdfGeneratedImage[],
  ): Promise<Buffer> {
    const content = PdfHtmlUtil.createDocumentHtml(
      document,
      generatedImages,
    );

    const html = getPdfTemplate(content);

    const browser = await chromium.launch(
      PDF_GENERATION_CONFIG.browser,
    );

    try {
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'networkidle',
      });
      
      const pdfBuffer = await page.pdf({
        format: PDF_GENERATION_CONFIG.page.format,
        printBackground: true,
        preferCSSPageSize: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
