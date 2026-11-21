import { IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
    @IsString()
    question: string;

    @IsOptional()
    @IsString()
    titlePrompt?: string;
}
