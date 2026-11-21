import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOllama } from '@langchain/ollama';
import { Document } from '@langchain/core/documents';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { CHAT_HISTORY_PROMPT } from './prompts/chat-history.prompt';

import {
    GENERAL_CHAT_PROMPT,
    IMAGE_DESCRIPTION_PROMPT,
    RAG_PROMPT,
    CHAT_TITLE_PROMPT,
    DETECT_INTENT_PROMPT,
    FILE_CONTENT_PROMPT,
    PRESENTATION_CONTENT_PROMPT,
    EXCEL_CONTENT_PROMPT,
    UNIQUE_FILE_NAME_PROMPT,
    WEB_SEARCH_PROMPT,
} from './prompts/chat.prompts';

import { LLM_CONFIG } from './config/llm.config';
import { imageToDataUrl } from './helper/image.helper';
import { MAX_TITLE_LENGTH } from './constants/chat.constants';
import { UserIntent } from './types/user-intent.type';
import { GeneratedFileContent } from './interfaces/generated-file-content.interface';
import { GeneratedPresentation } from './interfaces/generated-presentation.interface';
import { GeneratedExcelContent } from './interfaces/generated-excel-content.interface';

@Injectable()
export class LlmService {
    private readonly llm: ChatOllama;
    private readonly jsonLlm: ChatOllama;

    constructor(private readonly configService: ConfigService) {
        const modelConfig = {
            model: this.configService.get<string>('LLM_MODEL')!,
            baseUrl: this.configService.get<string>('OLLAMA_BASE_URL'),
            temperature: Number(
                this.configService.get(
                    'LLM_TEMPERATURE',
                    LLM_CONFIG.DEFAULT_TEMPERATURE,
                ),
            ),
            think: LLM_CONFIG.THINK,
        };
    
        this.llm = new ChatOllama(modelConfig);
    
        this.jsonLlm = new ChatOllama({
            ...modelConfig,
            format: 'json',
        });
    }

    async chat(
        question: string,
        history: BaseMessage[],
        signal?: AbortSignal,
    ): Promise<string> {
        const chain = GENERAL_CHAT_PROMPT
            .pipe(this.llm)
            .pipe(new StringOutputParser());
    
        return chain.invoke(
            { question, history },
            { signal },
        );
    }

    async answerWithContext(
        question: string,
        context: Document[],
        history: BaseMessage[],
        signal?: AbortSignal,
    ): Promise<string> {
        const chain = await createStuffDocumentsChain({
            llm: this.llm,
            prompt: RAG_PROMPT,
            outputParser: new StringOutputParser(),
        });
    
        return chain.invoke(
            { question, context, history },
            { signal },
        );
    }

    async describeImage(filePath: string): Promise<string> {
        const dataUrl = await imageToDataUrl(filePath);

        const response = await this.llm.invoke([
            new HumanMessage({
                content: [
                    {
                        type: 'text',
                        text: IMAGE_DESCRIPTION_PROMPT,
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: dataUrl,
                        },
                    },
                ],
            }),
        ]);

        return this.getResponseContent(response);
    }


    async generateChatTitle(
        question: string,
        existingTitles: string[] = [],
    ): Promise<string> {
        const prompt = CHAT_TITLE_PROMPT
            .replace('{question}', question)
            .replace(
                '{existingTitles}',
                existingTitles.length > 0
                    ? existingTitles.join('\n')
                    : 'Немає',
            );
    
        const response = await this.jsonLlm.invoke(prompt);
        const content = this.getResponseContent(response);
    
        let title: string;
    
        try {
            const result = this.parseJson<{ title: string }>(content);
    
            title = typeof result.title === 'string'
                ? result.title
                : question;
        } catch {
            title = question;
        }
    
        return title
            .replace(/^["'«»]+|["'«»]+$/g, '')
            .trim()
            .slice(0, MAX_TITLE_LENGTH);
    }    
   
    async detectIntent(
        question: string,
        signal?: AbortSignal,
    ): Promise<UserIntent> {
        const prompt = DETECT_INTENT_PROMPT.replace(
            '{question}',
            question,
        );

        const response = await this.llm.invoke(
            prompt,
            { signal },
        );

        const content = this.getResponseContent(response);

        try {
            const result = this.parseJson<UserIntent>(content);

            const validIntents = [
                'chat',
                'create_file',
                'rag',
                'generate_image',
                'chat_history',
                'web_search',
            ];

            if (!validIntents.includes(result.intent)) {
                throw new Error('Invalid intent');
            }

            if (
                !result.sources ||
                typeof result.sources.documents !== 'boolean' ||
                typeof result.sources.web !== 'boolean'
            ) {
                throw new Error('Invalid sources');
            }

            let searchQuery: string | null = null;

            if (
                result.sources.web &&
                typeof result.searchQuery === 'string'
            ) {
                searchQuery = result.searchQuery.trim() || null;
            }

            if (searchQuery && searchQuery.length > 500) {
                searchQuery = null;
            }

            return {
                ...result,
                searchQuery: result.sources.web
                    ? searchQuery
                    : null,
            };
        } catch (error) {
            if (signal?.aborted) {
                throw error;
            }

            return {
                intent: 'chat',
                format: null,
                description: question,
                sources: {
                    documents: false,
                    web: false,
                },
                searchQuery: null,
            };
        }
    }


    async generateFileContent(
        format: string,
        description: string,
        question: string,
        context: string,
    ): Promise<GeneratedFileContent> {
        const prompt = FILE_CONTENT_PROMPT
            .replace('{format}', format)
            .replace('{description}', description)
            .replace('{question}', question)
            .replace('{context}', context || 'Немає додаткового контексту.');
    
        const response = await this.llm.invoke(prompt);
    
        const result = this.parseJson<GeneratedFileContent>(
            this.getResponseContent(response),
        );
    
        return {
            fileName:
                typeof result.fileName === 'string'
                    ? result.fileName.trim().slice(0, 100)
                    : 'generated-file',
            content: result.content,
            images: result.images || [],
            tables: result.tables || [],
        };
    }


    async generatePresentationContent(
        format: string,
        description: string,
        question: string,
        context: string,
    ): Promise<GeneratedPresentation> {
        const prompt = PRESENTATION_CONTENT_PROMPT
            .replace('{format}', format)
            .replace('{description}', description)
            .replace('{question}', question)
            .replace(
                '{context}',
                context || 'There is no additional context.',
            );
        
        const response = await this.jsonLlm.invoke(prompt);
    
        const rawContent = this.getResponseContent(response);
    
        const result = this.parseJson<any>(rawContent);
    
        if (result.error) {
            throw new Error(
                `Presentation generation failed: ${result.error}`,
            );
        }
    
        if (
            !result.fileName ||
            !Array.isArray(result.slides) ||
            result.slides.length === 0
        ) {
            throw new Error(
                'LLM returned an invalid presentation structure',
            );
        }
    
        return result as GeneratedPresentation;
    }    

    private getResponseContent(response: BaseMessage): string {
        return typeof response.content === 'string'
            ? response.content.trim()
            : JSON.stringify(response.content);
    }

    private parseJson<T>(content: string): T {
        const jsonMatch = content.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('Failed to parse JSON response from LLM');
        }

        return JSON.parse(jsonMatch[0]) as T;
    }

    async generateExcelContent(
        description: string,
        question: string,
        context: string,
    ): Promise<GeneratedExcelContent> {
        const prompt = EXCEL_CONTENT_PROMPT
            .replace('{description}', description)
            .replace('{question}', question)
            .replace('{context}', context || 'There is no additional context.');
    
            const response = await this.llm.invoke(prompt);

            const result = this.parseJson<GeneratedExcelContent>(
                this.getResponseContent(response),
            );
                        
            return result;
    }

    async generateUniqueFileName(
        fileName: string,
        format: string,
        existingNames: string[],
    ): Promise<string> {
        const prompt = UNIQUE_FILE_NAME_PROMPT
            .replace('{fileName}', fileName)
            .replace('{format}', format)
            .replace(
                '{existingNames}',
                existingNames.length > 0
                    ? existingNames.join('\n')
                    : 'Немає',
            );
    
        const response = await this.llm.invoke(prompt);
    
        return this.getResponseContent(response)
            .replace(/^["'«»]+|["'«»]+$/g, '')
            .trim();
    }

    async chatHistory(
        question: string,
        context: string,
    ): Promise<string> {
        const prompt = CHAT_HISTORY_PROMPT
            .replace('{context}', context)
            .replace('{question}', question);
    
        const response = await this.llm.invoke(prompt);
    
        return this.getResponseContent(response);
    }

    async answerWithWebSearch(
        question: string,
        searchResults: {
            title: string;
            url: string;
            content: string;
        }[],
    ): Promise<string> {
        const context = searchResults
            .map(
                (result) =>
                    `Heading: ${result.title}\n` +
                    `Link: ${result.url}\n` +
                    `Information: ${result.content}`,
            )
            .join('\n\n');
    
        const prompt = WEB_SEARCH_PROMPT
            .replace('{question}', question)
            .replace('{context}', context);
    
        const response = await this.llm.invoke(prompt);
    
        return this.getResponseContent(response);
    }
}
