import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AskDto {
    @IsString()
    @IsNotEmpty()
    question: string;

    @IsOptional()
    @IsBoolean()
    userMessageAlreadySaved?: boolean;
}
