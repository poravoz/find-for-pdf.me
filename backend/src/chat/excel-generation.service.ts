import { Injectable, BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { addChart } from 'chartsheet';

import {
    GeneratedExcelContent,
    GeneratedExcelSheet,
    GeneratedExcelChart,
    ExcelChartSpec,
} from './interfaces/generated-excel-content.interface';

import { ExcelUtil } from './utils/excel.util';
import { EXCEL_GENERATION_CONFIG } from './config/excel-generation.config';

@Injectable()
export class ExcelGenerationService {
    async generateExcel(data: GeneratedExcelContent): Promise<Buffer> {
        this.validateData(data);
    
        const workbook = new ExcelJS.Workbook();
    
        workbook.creator = 'AI Studio';
        workbook.created = new Date();
    
        workbook.calcProperties.fullCalcOnLoad = true;
    
        const chartSpecs: ExcelChartSpec[] = [];
    
        for (const sheetData of data.sheets) {
            const sheetName = ExcelUtil.getUniqueSheetName(
                workbook,
                sheetData.name,
            );
    
            const worksheet = workbook.addWorksheet(sheetName);
    
            this.addTable(worksheet, sheetData);
            this.addWorksheetSettings(worksheet, sheetData);
    
            chartSpecs.push(
                ...this.prepareCharts(
                    worksheet,
                    sheetData,
                ),
            );
        }
    
        let buffer = Buffer.from(
            await workbook.xlsx.writeBuffer(),
        );
    
        for (const chartSpec of chartSpecs) {
            buffer = Buffer.from(
                await addChart(buffer, chartSpec),
            );
        }
    
        return buffer;
    }

    private addTable(
        worksheet: ExcelJS.Worksheet,
        sheetData: GeneratedExcelSheet,
    ): void {
        worksheet.addRow(sheetData.headers);

        for (const row of sheetData.rows) {
            worksheet.addRow(row);
        }

        this.formatHeader(worksheet, sheetData.style);
        this.formatRows(worksheet, sheetData.style);
        this.setColumnWidths(worksheet, sheetData.style);
        this.setNumberFormats(worksheet, sheetData.style);
    }

    private formatHeader(
        worksheet: ExcelJS.Worksheet,
        style: GeneratedExcelSheet['style'],
    ): void {
        const header = worksheet.getRow(1);

        header.font = {
            bold: style.headerFormat?.bold ?? true,
            italic: style.headerFormat?.italic ?? false,
            size: style.headerFormat?.fontSize ?? 11,
            color: {
                argb: `FF${style.headerFontColor || 'FFFFFF'}`,
            },
        };

        header.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
                argb: `FF${style.headerColor || '1F4E78'}`,
            },
        };

        header.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true,
        };

        header.height = 24;
    }

    private formatRows(
        worksheet: ExcelJS.Worksheet,
        style: GeneratedExcelSheet['style'],
    ): void {
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.alignment = {
                    vertical: 'middle',
                    wrapText: true,
                };

                if (
                    style.alternateRows &&
                    rowNumber > 1 &&
                    rowNumber % 2 === 0
                ) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: {
                            argb: 'FFF2F6FA',
                        },
                    };
                }
            });
        });
    }

    private setColumnWidths(
        worksheet: ExcelJS.Worksheet,
        style: GeneratedExcelSheet['style'],
    ): void {
        worksheet.columns.forEach((column, index) => {
            const customWidth = style.columnWidths?.[index];

            if (customWidth && customWidth > 0) {
                column.width = Math.min(customWidth, 60);
                return;
            }

            let maxLength = 10;

            column.eachCell?.({ includeEmpty: true }, (cell) => {
                const value = cell.value;

                const text = value === null || value === undefined
                    ? ''
                    : typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value);

                maxLength = Math.max(maxLength, text.length);
            });

            column.width = Math.min(maxLength + 2, 40);
        });
    }

    private setNumberFormats(
        worksheet: ExcelJS.Worksheet,
        style: GeneratedExcelSheet['style'],
    ): void {
        if (style.numberFormat) {
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) {
                    return;
                }

                row.eachCell((cell) => {
                    if (typeof cell.value === 'number') {
                        cell.numFmt = style.numberFormat!;
                    }
                });
            });
        }

        for (const [columnLetter, numberFormat] of Object.entries(
            style.columnNumberFormats || {},
        )) {
            worksheet.getColumn(columnLetter).numFmt = numberFormat;
        }
    }

    private addWorksheetSettings(
        worksheet: ExcelJS.Worksheet,
        sheetData: GeneratedExcelSheet,
    ): void {
        worksheet.views = [
            {
                state: 'frozen',
                ySplit: sheetData.headers.length > 0 ? 1 : 0,
            },
        ];

        if (sheetData.headers.length > 0 && worksheet.rowCount > 0) {
            worksheet.autoFilter = {
                from: {
                    row: 1,
                    column: 1,
                },
                to: {
                    row: worksheet.rowCount,
                    column: sheetData.headers.length,
                },
            };
        }
    }

    private async addChart(
        buffer: Buffer,
        worksheetName: string,
        sheetData: GeneratedExcelSheet,
        chart: GeneratedExcelChart,
    ): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();

        await workbook.xlsx.load(buffer);

        const worksheet = workbook.getWorksheet(worksheetName);

        if (!worksheet) {
            throw new BadRequestException(
                `Worksheet "${worksheetName}" not found`,
            );
        }

        const chartColumnStart = sheetData.headers.length + 2;
        const categoryColumn = chartColumnStart;

        worksheet.getColumn(categoryColumn).hidden = true;

        worksheet.getCell(1, categoryColumn).value = 'Category';

        chart.categories.forEach((category, index) => {
            worksheet.getCell(index + 2, categoryColumn).value =
                category;
        });

        const series = chart.series.map((item, index) => {
            const column = chartColumnStart + index + 1;

            worksheet.getColumn(column).hidden = true;

            worksheet.getCell(1, column).value = item.name;

            item.values.forEach((value, valueIndex) => {
                worksheet.getCell(valueIndex + 2, column).value =
                    value;
            });

            return {
                nameRef: this.getCellReference(
                    worksheetName,
                    column,
                    1,
            ),
                ref: this.getRangeReference(
                    worksheetName,
                    column,
                    2,
                    chart.categories.length + 1,
                ),
            };
        });

        const updatedBuffer = Buffer.from(
            await workbook.xlsx.writeBuffer(),
        );

        return Buffer.from(
            await addChart(updatedBuffer, {
                type: chart.type,
                title: chart.title,
                categories: this.getRangeReference(
                    worksheetName,
                    categoryColumn,
                    2,
                    chart.categories.length + 1,
                ),
                series,
                sheet: worksheetName,
                anchor: {
                    col: chartColumnStart + chart.series.length + 1,
                    row: 1,
                },
                width: EXCEL_GENERATION_CONFIG.chartWidth,
                height: EXCEL_GENERATION_CONFIG.chartHeight,
                dataLabels: chart.type === 'pie',
                legend: chart.type === 'pie' ? 'b' : 'r',
            }),
        );
    }

    private getCellReference(
        sheetName: string,
        column: number,
        row: number,
    ): string {
        return `'${sheetName.replace(/'/g, "''")}'!$${this.getColumnLetter(column)}$${row}`;
    }

    private getRangeReference(
        sheetName: string,
        column: number,
        startRow: number,
        endRow: number,
    ): string {
        const columnLetter = this.getColumnLetter(column);
        const escapedSheetName = sheetName.replace(/'/g, "''");

        return `'${escapedSheetName}'!$${columnLetter}$${startRow}:$${columnLetter}$${endRow}`;
    }

    private getColumnLetter(column: number): string {
        let result = '';
        let current = column;

        while (current > 0) {
            const remainder = (current - 1) % 26;

            result = String.fromCharCode(65 + remainder) + result;
            current = Math.floor((current - 1) / 26);
        }

        return result;
    }

    private validateData(data: GeneratedExcelContent): void {
        if (!data || !Array.isArray(data.sheets) || data.sheets.length === 0) {
            throw new BadRequestException(
                'Excel data must contain at least one worksheet',
            );
        }

        for (const sheet of data.sheets) {
            if (!sheet.name || !Array.isArray(sheet.headers)) {
                throw new BadRequestException(
                    'Each worksheet must have a name and headers',
                );
            }

            for (const row of sheet.rows || []) {
                if (row.length !== sheet.headers.length) {
                    throw new BadRequestException(
                        `Row in worksheet "${sheet.name}" does not match headers`,
                    );
                }
            }

            for (const chart of sheet.charts || []) {
                if (!chart.categories.length || !chart.series.length) {
                    throw new BadRequestException(
                        `Chart "${chart.title}" must contain categories and series`,
                    );
                }

                for (const series of chart.series) {
                    if (series.values.length !== chart.categories.length) {
                        throw new BadRequestException(
                            `Chart series "${series.name}" does not match categories`,
                        );
                    }
                }
            }
        }
    }

    private prepareCharts(
        worksheet: ExcelJS.Worksheet,
        sheetData: GeneratedExcelSheet,
    ): ExcelChartSpec[] {
        const chartSpecs: ExcelChartSpec[] = [];
    
        for (const chart of sheetData.charts || []) {
            const startColumn = worksheet.columnCount + 2;
            const categoryColumn = startColumn;
    
            worksheet.getColumn(categoryColumn).hidden = true;
            worksheet.getCell(1, categoryColumn).value = 'Category';
    
            chart.categories.forEach((category, index) => {
                worksheet.getCell(index + 2, categoryColumn).value =
                    category;
            });
    
            const series = chart.series.map((item, index) => {
                const column = startColumn + index + 1;
    
                worksheet.getColumn(column).hidden = true;
                worksheet.getCell(1, column).value = item.name;
    
                item.values.forEach((value, valueIndex) => {
                    worksheet.getCell(valueIndex + 2, column).value =
                        value;
                });
    
                const columnLetter = this.getColumnLetter(column);
    
                return {
                    nameRef: `'${worksheet.name}'!$${columnLetter}$1`,
                    ref: `'${worksheet.name}'!$${columnLetter}$2:$${columnLetter}$${chart.categories.length + 1}`,
                };
            });
    
            const categoryLetter =
                this.getColumnLetter(categoryColumn);
    
            chartSpecs.push({
                type: chart.type,
                title: chart.title,
                sheet: worksheet.name,
                categories: `'${worksheet.name}'!$${categoryLetter}$2:$${categoryLetter}$${chart.categories.length + 1}`,
                series,
                anchor: {
                    col: startColumn + chart.series.length + 1,
                    row: 1,
                },
                width: EXCEL_GENERATION_CONFIG.chartWidth,
                height: EXCEL_GENERATION_CONFIG.chartHeight,
                dataLabels: chart.type === 'pie',
                legend: chart.type === 'pie' ? 'b' : 'r',
            });
        }
    
        return chartSpecs;
    }
}
