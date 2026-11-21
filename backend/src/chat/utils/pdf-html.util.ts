
import {
    PdfDocumentData,
    PdfGeneratedImage,
  } from '../interfaces/pdf-generation.interface';
  
  export class PdfHtmlUtil {
    static escapeHtml(value: unknown): string {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  
    static createTextHtml(text: string): string {
        const trimmedText = text.trim();
      
        if (!trimmedText) {
          return '';
        }
      
        if (trimmedText.startsWith('### ')) {
          return `<h3>${this.escapeHtml(trimmedText.substring(4))}</h3>`;
        }
      
        if (trimmedText.startsWith('## ')) {
          return `<h2>${this.escapeHtml(trimmedText.substring(3))}</h2>`;
        }
      
        if (trimmedText.startsWith('# ')) {
          return `<h1>${this.escapeHtml(trimmedText.substring(2))}</h1>`;
        }
      
        return `<p>${this.escapeHtml(trimmedText)}</p>`;
      }
  
    static createImageHtml(imageBuffer: Buffer): string {
      const base64 = imageBuffer.toString('base64');
  
      return `
        <figure>
          <img src="data:image/png;base64,${base64}" />
        </figure>
      `;
    }
  
    static createTableHtml(
      table: PdfDocumentData['tables'][number],
    ): string {
      const headers = table.headers
        .map((header) => `<th>${this.escapeHtml(header)}</th>`)
        .join('');
  
      const rows = table.rows
        .map((row) => {
          const cells = row
            .map((cell) => `<td>${this.escapeHtml(cell)}</td>`)
            .join('');
  
          return `<tr>${cells}</tr>`;
        })
        .join('');
  
      return `
        <section>
            <h3>${this.escapeHtml(table.title)}</h3>
  
          <table>
            <thead>
              <tr>${headers}</tr>
            </thead>
  
            <tbody>
              ${rows}
            </tbody>
          </table>
        </section>
      `;
    }
  
    static createDocumentHtml(
      document: PdfDocumentData,
      generatedImages: PdfGeneratedImage[],
    ): string {
      const paragraphs = document.content.split('\n');
      const content: string[] = [];
  
      for (let position = 0; position <= paragraphs.length; position++) {
        const text = paragraphs[position];
  
        if (text !== undefined) {
          content.push(this.createTextHtml(text));
        }
  
        generatedImages
          .filter((image) => image.position === position)
          .forEach((image) => {
            content.push(this.createImageHtml(image.imageBuffer));
          });
  
        document.tables
          .filter((table) => table.position === position)
          .forEach((table) => {
            content.push(this.createTableHtml(table));
          });
      }
  
      return content.join('\n');
    }
  }
  