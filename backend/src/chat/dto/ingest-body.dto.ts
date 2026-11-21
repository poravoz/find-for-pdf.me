import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { IngestDocDto } from './ingest-doc.dto';

export class IngestBodyDto {
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => IngestDocDto)
    docs?: IngestDocDto[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    filePaths?: string[];
}