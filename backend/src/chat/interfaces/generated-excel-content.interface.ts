export type ExcelCellValue =
    | string
    | number
    | boolean
    | null;

export interface GeneratedExcelContent {
    fileName: string;
    sheets: GeneratedExcelSheet[];
}

export interface GeneratedExcelSheet {
    name: string;
    headers: string[];
    rows: ExcelCellValue[][];
    charts: GeneratedExcelChart[];
    style: GeneratedExcelStyle;
}

export interface GeneratedExcelChart {
    type: 'bar' | 'line' | 'pie';
    title: string;
    categories: ExcelCellValue[];
    series: {
        name: string;
        values: number[];
    }[];
}

export interface GeneratedExcelStyle {
    headerColor?: string;
    headerFontColor?: string;
    alternateRows?: boolean;
    columnWidths?: number[];
    numberFormat?: string;
    columnNumberFormats?: Record<string, string>;
    headerFormat?: {
        bold?: boolean;
        italic?: boolean;
        fontSize?: number;
    };
}

export interface ExcelChartSeries {
    nameRef: string;
    ref: string;
}

export interface ExcelChartSpec {
    type: GeneratedExcelChart['type'];
    title: string;
    sheet: string;
    categories: string;
    series: ExcelChartSeries[];
    anchor: {
        col: number;
        row: number;
    };
    width: number;
    height: number;
    dataLabels: boolean;
    legend: 'b' | 'r';
}