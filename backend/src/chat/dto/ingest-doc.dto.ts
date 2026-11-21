import { IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

export class IngestDocDto {
    @IsString()
    content: string;

    @IsOptional()
    @IsObject()
    meta?: Record<string, unknown>;
}
