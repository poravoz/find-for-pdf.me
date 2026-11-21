import ExcelJS from 'exceljs';
import { EXCEL_GENERATION_CONFIG } from '../config/excel-generation.config';

export class ExcelUtil {
    static formatHeader(
        worksheet: ExcelJS.Worksheet,
        color?: string,
        fontColor?: string,
    ): void {
        const header = worksheet.getRow(1);

        header.font = {
            bold: true,
            color: {
                argb: `FF${fontColor || EXCEL_GENERATION_CONFIG.defaultHeaderFontColor}`,
            },
        };

        header.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
                argb: `FF${color || EXCEL_GENERATION_CONFIG.defaultHeaderColor}`,
            },
        };

        header.alignment = {
            vertical: 'middle',
            horizontal: 'center',
        };

        header.height = 24;
    }

    static setColumnWidths(
        worksheet: ExcelJS.Worksheet,
        customWidths?: number[],
    ): void {
        worksheet.columns.forEach((column, index) => {
            if (customWidths?.[index]) {
                column.width = customWidths[index];
                return;
            }

            let maxLength = EXCEL_GENERATION_CONFIG.minColumnWidth;

            column.eachCell?.({ includeEmpty: true }, (cell) => {
                const length = String(cell.value ?? '').length;

                maxLength = Math.max(maxLength, length);
            });

            column.width = Math.min(
                maxLength + 2,
                EXCEL_GENERATION_CONFIG.maxColumnWidth,
            );
        });
    }

    static formatRows(
        worksheet: ExcelJS.Worksheet,
        alternateRows?: boolean,
    ): void {
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    bottom: {
                        style: 'thin',
                        color: {
                            argb: `FF${EXCEL_GENERATION_CONFIG.borderColor}`,
                        },
                    },
                };

                if (
                    alternateRows &&
                    rowNumber > 1 &&
                    rowNumber % 2 === 0
                ) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: {
                            argb: `FF${EXCEL_GENERATION_CONFIG.alternateRowColor}`,
                        },
                    };
                }
            });
        });
    }

    static normalizeSheetName(name: string): string {
        const normalized = name
            .replace(/[\\/*?:[\]]/g, '')
            .trim()
            .slice(0, 31);

        return normalized || 'Sheet';
    }

    static getUniqueSheetName(
        workbook: ExcelJS.Workbook,
        name: string,
    ): string {
        const baseName = this.normalizeSheetName(name);
        let uniqueName = baseName;
        let counter = 1;

        while (workbook.getWorksheet(uniqueName)) {
            const suffix = `_${counter}`;
            uniqueName = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
            counter++;
        }

        return uniqueName;
    }
}
