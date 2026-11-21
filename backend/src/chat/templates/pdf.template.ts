
import { PDF_GENERATION_CONFIG } from '../config/pdf-generation.config';

export function getPdfTemplate(content: string): string {
  const styles = PDF_GENERATION_CONFIG.styles;
  const page = PDF_GENERATION_CONFIG.page;

  return `
    <!DOCTYPE html>
    <html lang="uk">
      <head>
        <meta charset="UTF-8" />

        <style>
          @page {
            size: ${page.format};
            margin:
              ${page.margin.top}
              ${page.margin.right}
              ${page.margin.bottom}
              ${page.margin.left};
          }

          body {
            font-family: ${styles.fontFamily};
            font-size: ${styles.fontSize};
            line-height: ${styles.lineHeight};
            color: ${styles.textColor};
          }

          h1, h2, h3 {
            color: ${styles.headingColor};
            page-break-after: avoid;
          }

          p {
            margin: 8px 0;
            text-align: justify;
            overflow-wrap: break-word;
          }

          figure {
            margin: 20px 0;
            text-align: center;
            page-break-inside: avoid;
          }

          img {
            max-width: 100%;
            max-height: 400px;
            object-fit: contain;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 10pt;
          }

          thead {
            display: table-header-group;
          }

          th {
            font-weight: bold;
          }
          
          td, th {
            word-break: break-word;
          }

          tr {
            page-break-inside: avoid;
          }

          th, td {
            border: 1px solid ${styles.tableBorderColor};
            padding: 8px;
            text-align: left;
            vertical-align: top;
            overflow-wrap: break-word;
          }

          th {
            background-color: ${styles.tableHeaderColor};
          }
        </style>
      </head>

      <body>
        ${content}
      </body>
    </html>
  `;
}
