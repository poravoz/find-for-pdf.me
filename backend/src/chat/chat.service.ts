import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    AIMessage,
    BaseMessage,
    HumanMessage,
} from '@langchain/core/messages';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { LlmService } from './llm.service';
import { VectorStoreService } from './vector-store.service';
import { StorageService } from './storage.service';
import { FileGenerationService } from './file-generation.service';
import { extractSources } from './helper/rag.helper';
import {
    DEFAULT_CHAT_TITLE,
    HISTORY_LIMIT,
    MAX_TITLE_LENGTH,
} from './constants/chat.constants';
import { ChatResponse } from './types/chat-response.type';
import { ImageGenerationService } from './image-generation.service';
import { ExcelGenerationService } from './excel-generation.service';
import { FILE_CONTENT_TYPES } from './constants/file-generation.constants';
import { GeneratedFile } from './interfaces/file-generation.interface';
import { Document } from '@langchain/core/documents';
import { WebSearchService } from './web-search.service';
import { isAbortError } from './helper/abort.helper';
import { In } from 'typeorm';
import {
    FILE_GENERATION_ERROR_MESSAGE,
    WEB_SEARCH_QUERY_ERROR_MESSAGE,
} from './prompts/chat.prompts';
import { GenerationTask } from './entities/generation-task.entity';

@Injectable()
export class ChatService {
    private readonly generationControllers = new Map<string, AbortController>()

    constructor(
        @InjectRepository(Chat)
        private readonly chatRepository: Repository<Chat>,

        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,

        @InjectRepository(GenerationTask)
        private readonly generationTaskRepository: Repository<GenerationTask>,

        private readonly llmService: LlmService,
        private readonly vectorStoreService: VectorStoreService,
        private readonly storageService: StorageService,
        private readonly fileGenerationService: FileGenerationService,
        private readonly imageGenerationService: ImageGenerationService,
        private readonly excelGenerationService: ExcelGenerationService,
        private readonly webSearchService: WebSearchService,
    ) {}

    async createChat(userId: string, title?: string) {
        const chatTitle = title?.trim() || DEFAULT_CHAT_TITLE;
    
        if (title?.trim()) {
            const existingChat = await this.chatRepository.findOneBy({
                title: chatTitle,
                userId,
            });
    
            if (existingChat) {
                throw new ConflictException(
                    'Chat with this title already exists',
                );
            }
        }
    
        const chat = this.chatRepository.create({
            title: chatTitle,
            userId,
        });
    
        return this.chatRepository.save(chat);
    }

    async getChats(userId: string) {
        return this.chatRepository.find({
            where: { userId },
            order: {
                updatedAt: 'DESC',
            },
        });
    }

    async getMessages(chatId: string, userId: string) {
        await this.getChatOrFail(chatId, userId);

        const messages = await this.messageRepository.find({
            where: { chatId },
            order: {
                createdAt: 'ASC',
            },
        });

        // Store the object key in the database and create a fresh signed URL
        // whenever chat history is loaded, so image links do not expire in history.
        return Promise.all(messages.map(async (message) => {
            const imageMatch = message.content.match(
                /\[\[generated-image:(generated-images\/[a-zA-Z0-9-]+\.png)\]\]/,
            );

            if (!imageMatch) {
                return message;
            }

            const imageUrl = await this.storageService.getDownloadUrl(imageMatch[1]);

            return {
                ...message,
                content: message.content.replace(
                    imageMatch[0],
                    `![Generated image](${imageUrl})`,
                ),
            };
        }));
    }

    async updateChatTitle(
        chatId: string,
        userId: string,
        title: string,
    ) {
        const chatTitle = title.trim();

        const existingChat = await this.chatRepository.findOneBy({
            title: chatTitle,
            userId,
        });

        if (existingChat && existingChat.id !== chatId) {
            throw new ConflictException(
                'Chat with this title already exists',
            );
        }

        await this.chatRepository.update(chatId, {
            title: chatTitle,
        });

        return {
            success: true,
            message: 'Chat title updated',
        };
    }

    async deleteChat(chatId: string, userId: string) {
        await this.getChatOrFail(chatId, userId);
    
        await this.vectorStoreService.deleteByChatId(chatId);
    
        await this.messageRepository.delete({
            chatId,
        });
    
        await this.chatRepository.delete({
            id: chatId,
            userId,
        });
    
        return {
            success: true,
            message: 'Chat deleted',
        };
    }


    async query(
        chatId: string,
        userId: string,
        question: string,
        signal?: AbortSignal,
        historyOverride?: BaseMessage[],
        userMessageAlreadySaved = false,
        replaceAssistantMessageId?: string,
    ): Promise<ChatResponse> {
        if (!question?.trim()) {
            return {
                success: false,
                message: 'Question cannot be empty',
                answer: '',
                sources: [],
            };
        }
    
        try {
            signal?.throwIfAborted();
    
            const chat = await this.getChatOrFail(chatId, userId);
            const history = historyOverride ?? await this.getHistory(chatId);
    
            if (!userMessageAlreadySaved) {
                await this.saveUserMessage(chatId, question.trim());
            }
    
            signal?.throwIfAborted();
    
            const intent = await this.llmService.detectIntent(
                question,
                signal,
            );

            if (
                intent.sources.web &&
                (
                    !intent.searchQuery ||
                    intent.searchQuery.length > 1500
                )
            ) {

                const answer = WEB_SEARCH_QUERY_ERROR_MESSAGE;

                await this.saveExchange(
                    chatId,
                    question,
                    answer,
                    [],
                    true,
                    replaceAssistantMessageId,
                );
            
                await this.touchChat(chat);
            
                return {
                    success: true,
                    chatId,
                    answer,
                    sources: [],
                    mode: 'general',
                };
            }
    
            signal?.throwIfAborted();
    
            if (intent.intent === 'chat_history') {
                const chats = await this.chatRepository.find({
                    where: { userId },
                    order: {
                        createdAt: 'ASC',
                    },
                });
    
                const chatHistory = [];
    
                for (const item of chats) {
                    signal?.throwIfAborted();
    
                    const messages = await this.messageRepository.find({
                        where: {
                            chatId: item.id,
                            role: 'user',
                        },
                        order: {
                            createdAt: 'ASC',
                        },
                    });
    
                    chatHistory.push({
                        title: item.title,
                        questions: messages.map(
                            (message) => message.content,
                        ),
                    });
                }
    
                const context = JSON.stringify(
                    chatHistory,
                    null,
                    2,
                );
    
                signal?.throwIfAborted();
    
                const answer = await this.llmService.chatHistory(
                    question,
                    context,
                );
    
                signal?.throwIfAborted();
    
                await this.saveExchange(
                    chatId,
                    question,
                    answer,
                    [],
                    true,
                    replaceAssistantMessageId,
                );
    
                await this.touchChat(chat);
    
                return {
                    success: true,
                    chatId,
                    answer,
                    sources: [],
                    contextCount: chats.length,
                    mode: 'chat-history',
                };
            }
    
            if (intent.intent === 'generate_image') {
                signal?.throwIfAborted();
    
                return await this.handleImageGeneration(
                    chatId,
                    chat,
                    question,
                    intent.description,
                    replaceAssistantMessageId,
                );
            }
    
            if (intent.intent === 'create_file') {
                let generatedFile: {
                    answer: string;
                    fileName: string;
                    downloadUrl: string;
                } | null;

                try {
                    generatedFile = await this.generateFileFromQuestion(
                        question,
                        intent.format,
                        intent.description,
                        userId,
                        chatId,
                        intent.sources,
                        intent.searchQuery,
                    );
                } catch (error) {
                    if (signal?.aborted || isAbortError(error)) {
                        throw error;
                    }

                    console.error('File generation failed:', error);

                    const answer = FILE_GENERATION_ERROR_MESSAGE.trim();

                    await this.saveExchange(
                        chatId,
                        question,
                        answer,
                        [],
                        true,
                        replaceAssistantMessageId,
                    );

                    await this.touchChat(chat);

                    return {
                        success: true,
                        chatId,
                        answer,
                        sources: [],
                        mode: 'file-generation',
                    };
                }

                signal?.throwIfAborted();

                if (generatedFile) {
                    await this.saveExchange(
                        chatId,
                        question,
                        generatedFile.answer,
                        [],
                        true,
                        replaceAssistantMessageId,
                    );

                    await this.touchChat(chat);

                    return {
                        success: true,
                        chatId,
                        answer: generatedFile.answer,
                        fileName: generatedFile.fileName,
                        downloadUrl: generatedFile.downloadUrl,
                        mode: 'file-generation',
                    };
                }
            }
    
            if (intent.intent === 'web_search') {
                const searchResults = await this.webSearchService.search(
                    intent.searchQuery!,
                );
    
                signal?.throwIfAborted();
    
                const answer = await this.llmService.answerWithWebSearch(
                    question,
                    searchResults,
                );
    
                signal?.throwIfAborted();
    
                const sources = searchResults.map(
                    (result) => result.url,
                );
    
                await this.saveExchange(
                    chatId,
                    question,
                    answer,
                    sources,
                    true,
                    replaceAssistantMessageId,
                );
    
                await this.touchChat(chat);
    
                return {
                    success: true,
                    chatId,
                    answer,
                    sources,
                    contextCount: searchResults.length,
                    mode: 'web-search',
                };
            }
    
            let contextDocs: Document[] = [];
    
            if (intent.intent === 'rag') {
                const pdfDocs =
                    await this.vectorStoreService.searchRelevant(
                        chatId,
                        question,
                    );
    
                signal?.throwIfAborted();
    
                const memoryDocs =
                    await this.vectorStoreService.searchChatMessages(
                        userId,
                        question,
                    );
    
                contextDocs = [
                    ...pdfDocs,
                    ...memoryDocs,
                ];
            }
    
            signal?.throwIfAborted();
    
            const answer =
                intent.intent === 'rag' && contextDocs.length > 0
                    ? await this.llmService.answerWithContext(
                        question,
                        contextDocs,
                        history,
                        signal,
                    )
                    : await this.llmService.chat(
                        question,
                        history,
                        signal,
                    );
    
            signal?.throwIfAborted();
    
            const sources =
                intent.intent === 'rag' && contextDocs.length > 0
                    ? extractSources(contextDocs)
                    : [];
    
            await this.saveExchange(
                chatId,
                question,
                answer,
                sources,
                true,
                replaceAssistantMessageId,
            );
    
            await this.touchChat(chat);
    
            return {
                success: true,
                chatId,
                answer,
                sources,
                contextCount: contextDocs.length,
                mode: contextDocs.length > 0 ? 'rag' : 'general',
            };
        } catch (error) {
            if (signal?.aborted || isAbortError(error)) {
                return {
                    success: false,
                    message: 'Generation cancelled',
                    answer: '',
                    sources: [],
                };
            }
    
            throw error;
        }
    }    

    async queryNewChat(
        userId: string,
        question: string,
        signal?: AbortSignal,
    ): Promise<ChatResponse> {
        if (!question?.trim()) {
            return {
                success: false,
                message: 'Question cannot be empty',
                answer: '',
                sources: [],
            };
        }
    
        const chat = await this.prepareNewChat(userId, question);

        return this.query(
            chat.id,
            userId,
            question,
            signal,
            undefined,
            true,
        );
    }

    async getChatOrFail(
        chatId: string,
        userId: string,
    ): Promise<Chat> {
        const chat = await this.chatRepository.findOne({
            where: {
                id: chatId,
                userId,
            },
        });

        if (!chat) {
            throw new NotFoundException('Chat not found');
        }

        return chat;
    }

    private async getHistory(chatId: string): Promise<BaseMessage[]> {
        const messages = await this.messageRepository.find({
            where: { chatId },
            order: { createdAt: 'DESC' },
            take: HISTORY_LIMIT,
        });
    
        return messages.reverse().map((message) => {
            if (message.role === 'user') {
                return new HumanMessage(message.content);
            }
    
            return new AIMessage(message.content);
        });
    }

    private async saveUserMessage(
        chatId: string,
        question: string,
    ): Promise<Message> {
        const chat = await this.chatRepository.findOne({
            where: { id: chatId },
        });
    
        if (!chat) {
            throw new NotFoundException('Chat not found');
        }
    
        const message = this.messageRepository.create({
            chatId,
            role: 'user',
            content: question,
        });
    
        const savedMessage = await this.messageRepository.save(message);
    
        if (question.trim()) {
            await this.vectorStoreService.addChatMessages(
                chat.userId,
                chatId,
                chat.title,
                [
                    {
                        role: message.role,
                        content: message.content,
                        createdAt: message.createdAt,
                    },
                ],
            );
        }
    
        return savedMessage;
    }
   
    private async saveExchange(
        chatId: string,
        question: string,
        answer: string,
        sources: string[],
        userMessageAlreadySaved = false,
        replaceAssistantMessageId?: string,
    ): Promise<void> {
        if (!userMessageAlreadySaved) {
            await this.saveUserMessage(chatId, question);
        }
        
        const chat = await this.chatRepository.findOne({
            where: { id: chatId },
        });

        if (!chat) {
            throw new NotFoundException('Chat not found');
        }

        if (replaceAssistantMessageId) {
            const result = await this.messageRepository.update(
                {
                    id: replaceAssistantMessageId,
                    chatId,
                    role: 'assistant',
                },
                {
                    content: answer,
                    sources,
                },
            );

            if (!result.affected) {
                throw new NotFoundException('Assistant message not found');
            }

            await this.rebuildChatVectorIndex(
                chatId,
                chat.userId,
                chat.title,
            );

            return;
        }

        const assistantMessage = this.messageRepository.create({
            chatId,
            role: 'assistant',
            content: answer,
            sources,
        });

        await this.messageRepository.save(assistantMessage);

        await this.vectorStoreService.addChatMessages(
            chat.userId,
            chatId,
            chat.title,
            [
                {
                    role: assistantMessage.role,
                    content: assistantMessage.content,
                    createdAt: assistantMessage.createdAt,
                },
            ],
        );
    }

    private async touchChat(chat: Chat): Promise<void> {
        await this.chatRepository.update(
            { id: chat.id },
            { updatedAt: new Date() },
        );
    }    
   
    private async generateFileFromQuestion(
        question: string,
        format: string | null,
        description: string,
        userId: string,
        chatId: string,
        sources: {
            documents: boolean;
            web: boolean;
        },
        searchQuery: string | null,
    ): Promise<{
        answer: string;
        fileName: string;
        downloadUrl: string;
    } | null> {
        if (!format) {
            return null;
        }

        let context = '';
        let sourceUrls: string[] = [];

        if (sources.documents) {
            const pdfDocs =
                await this.vectorStoreService.searchRelevant(
                    chatId,
                    question,
                );

            context += pdfDocs
                .map((doc) => doc.pageContent)
                .join('\n\n');

            sourceUrls.push(...extractSources(pdfDocs));
        }

        if (sources.web) {
            const searchResults =
                await this.webSearchService.search(searchQuery!);

            context += '\n\nInformation from internet:\n';

            context += searchResults
                .map((result) => {
                    return `
                        Heading: ${result.title}
                        Link: ${result.url}
                        Information: ${result.content}
                    `;
                })
                .join('\n\n');

            sourceUrls.push(
                ...searchResults.map((result) => result.url),
            );
        }
    
        let generatedFile: GeneratedFile;
    
        if (format.toLowerCase() === 'xlsx') {
            const excelContent =
            await this.llmService.generateExcelContent(
                description,
                question,
                context,
            );
    
            const excelBuffer =
                await this.excelGenerationService.generateExcel(
                    excelContent,
                );
    
            generatedFile = {
                buffer: excelBuffer,
                fileName: `${excelContent.fileName}.xlsx`,
                contentType: FILE_CONTENT_TYPES.XLSX,
            };
        } else {
            const fileContent = await this.getGeneratedFileContent(
                format,
                description,
                question,
                context,
            );
    
            generatedFile =
                await this.fileGenerationService.generateFile(
                    format,
                    fileContent.content,
                    fileContent.fileName,
                );
        }
    
        const savedFile = await this.saveGeneratedFile(
            generatedFile,
            format,
            userId,
        );
    
        return {
            answer: `${savedFile.fileName}
    
    [Download file](${savedFile.downloadUrl})`,
            fileName: savedFile.fileName,
            downloadUrl: savedFile.downloadUrl,
        };
    }

    private async handleImageGeneration(
        chatId: string,
        chat: Chat,
        question: string,
        description: string,
        replaceAssistantMessageId?: string,
    ): Promise<ChatResponse> {
        const generatedImage =
            await this.imageGenerationService.generateImage(
                description,
            );
    
        // Keep a stable storage key in the message. A fresh signed URL is
        // generated by getMessages() whenever the chat history is opened.
        const answer = `Image successfully generated!\n\n[[generated-image:${generatedImage.fileName}]]`;
    
        await this.saveExchange(
            chatId,
            question,
            answer,
            [],
            true,
            replaceAssistantMessageId,
        );
    
        await this.touchChat(chat);
    
        return {
            success: true,
            chatId,
            answer,
            sources: [],
            contextCount: 0,
            mode: 'image-generation',
            imageUrl: generatedImage.downloadUrl,
            imageFileName: generatedImage.fileName,
        };
    }

    private async getGeneratedFileContent(
        format: string,
        description: string,
        question: string,
        context: string,
    ): Promise<{
        fileName: string;
        content: string;
    }> {
        if (format === 'pptx') {
            const presentation =
                await this.llmService.generatePresentationContent(
                    format,
                    description,
                    question,
                    context,
                );
    
            return {
                fileName: presentation.fileName,
                content: JSON.stringify(presentation),
            };
        }
    
        const generatedContent =
            await this.llmService.generateFileContent(
                format,
                description,
                question,
                context,
            );
    
        return {
            fileName: generatedContent.fileName,
            content: JSON.stringify(generatedContent),
        };
    }

    private sanitizeFileName(fileName: string, format: string): string {
        const nameWithoutExtension = fileName.replace(/\.[^.]+$/, '');
    
        const safeName = nameWithoutExtension
            .trim()
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/[. ]+$/g, '');
    
        const fileNamePrefix = safeName || 'generated-file';
    
        return `${fileNamePrefix}.${format.toLowerCase()}`;
    }

    private async saveGeneratedFile(
        generatedFile: GeneratedFile,
        format: string,
        userId: string,
    ): Promise<{
        fileName: string;
        downloadUrl: string;
    }> {
        const initialFileName = this.sanitizeFileName(
            generatedFile.fileName,
            format,
        );
    
        const folder = this.storageService.getFileFolder(
            initialFileName,
        );
    
        const existingFileNames =
            await this.storageService.getExistingFileNames();
    
        const userFolder = `${folder}/${userId}/`;
    
        const userFileNames = existingFileNames
            .filter((fileName) => fileName.startsWith(userFolder))
            .map((fileName) => fileName.replace(userFolder, ''));
    
        const existingNamesWithoutExtension = userFileNames.map(
            (fileName) => fileName.replace(/\.[^.]+$/, ''),
        );
    
        let fileName = await this.llmService.generateUniqueFileName(
            initialFileName.replace(/\.[^.]+$/, ''),
            format,
            existingNamesWithoutExtension,
        );
    
        fileName = this.sanitizeFileName(fileName, format);
    
        const existingNames = new Set(
            userFileNames.map((name) => name.toLowerCase()),
        );
    
        const baseName = fileName.replace(/\.[^.]+$/, '');
        const extension = `.${format.toLowerCase()}`;
    
        let uniqueFileName = fileName;
        let number = 2;
    
        while (existingNames.has(uniqueFileName.toLowerCase())) {
            uniqueFileName = `${baseName} (${number})${extension}`;
            number++;
        }
    
        const filePath = `${userFolder}${uniqueFileName}`;
    
        const uploadedFileName = await this.storageService.uploadFile(
            filePath,
            generatedFile.buffer,
            generatedFile.contentType,
        );
    
        const downloadUrl = await this.storageService.getDownloadUrl(
            uploadedFileName,
        );
    
        return {
            fileName: uniqueFileName,
            downloadUrl,
        };
    }

    private async generateUniqueChatTitle(
        question: string,
        chatId: string,
        userId: string,
    ): Promise<string> {
        const chats = await this.chatRepository.find({
            where: { userId },
        });
    
        const existingTitles = chats
            .filter((chat) => chat.id !== chatId)
            .map((chat) => chat.title);
    
        let title = '';
    
        for (let i = 0; i < 3; i++) {
            try {
                title = await this.llmService.generateChatTitle(
                    question,
                    existingTitles,
                );
            } catch {
                break;
            }
    
            if (!title) {
                break;
            }
    
            const existingChat = await this.chatRepository.findOneBy({
                title,
                userId,
            });
    
            if (!existingChat || existingChat.id === chatId) {
                return title;
            }
    
            existingTitles.push(title);
        }
    
        const baseTitle = question.trim().slice(0, MAX_TITLE_LENGTH);
    
        title = baseTitle;
    
        let number = 2;
    
        while (await this.chatRepository.findOneBy({ title, userId })) {
            const suffix = ` (${number})`;
    
            title = `${baseTitle.slice(0, MAX_TITLE_LENGTH - suffix.length)}${suffix}`;
    
            number++;
        }
    
        return title;
    }

    async editMessage(
        chatId: string,
        userId: string,
        messageId: string,
        newQuestion: string,
        signal?: AbortSignal,
    ): Promise<ChatResponse> {
        const question = newQuestion.trim();
    
        if (!question) {
            return {
                success: false,
                message: 'Question cannot be empty',
                answer: '',
                sources: [],
            };
        }
    
        signal?.throwIfAborted();
    
        const chat = await this.getChatOrFail(chatId, userId);
    
        const messages = await this.messageRepository.find({
            where: { chatId },
            order: { createdAt: 'ASC' },
        });
    
        const messageIndex = messages.findIndex(
            (message) => message.id === messageId,
        );
    
        if (
            messageIndex === -1 ||
            messages[messageIndex].role !== 'user'
        ) {
            throw new NotFoundException('User message not found');
        }
    
        const history: BaseMessage[] = messages
            .slice(0, messageIndex)
            .map((message) => {
                if (message.role === 'user') {
                    return new HumanMessage(message.content);
                }
    
                return new AIMessage(message.content);
            });
    
        signal?.throwIfAborted();
    
        const messagesToDelete = messages.slice(messageIndex + 1);

        if (messagesToDelete.length > 0) {
            const oldMessageIds = messagesToDelete.map(
                (message) => message.id,
            );
        
            await this.messageRepository.delete({
                chatId,
                id: In(oldMessageIds),
            });
        }
        
        await this.messageRepository.update(
            {
                id: messageId,
                chatId,
            },
            {
                content: question,
            },
        );
    
        await this.rebuildChatVectorIndex(
            chatId,
            userId,
            chat.title,
        );
    
        signal?.throwIfAborted();
    
        await this.saveUserMessage(chatId, question);
    
        let response: ChatResponse;
    
        try {
            response = await this.query(
                chatId,
                userId,
                question,
                signal,
                history,
                true,
            );
        } catch (error) {
            if (signal?.aborted || isAbortError(error)) {
                await this.rebuildChatVectorIndex(
                    chatId,
                    userId,
                    chat.title,
                );
    
                return {
                    success: false,
                    message: 'Generation cancelled',
                    answer: '',
                    sources: [],
                };
            }
    
            throw error;
        }
    
        await this.rebuildChatVectorIndex(
            chatId,
            userId,
            chat.title,
        );
    
        return response;
    }    

    private async rebuildChatVectorIndex(
        chatId: string,
        userId: string,
        chatTitle: string,
    ): Promise<void> {
        await this.vectorStoreService.deleteChatMessagesByChatId(chatId);

        const messages = await this.messageRepository.find({
            where: { chatId },
            order: { createdAt: 'ASC' },
        });

        const messagesWithContent = messages.filter(
            (message) => message.content.trim(),
        );
        
        if (messagesWithContent.length === 0) {
            return;
        }
        
        await this.vectorStoreService.addChatMessages(
            userId,
            chatId,
            chatTitle,
            messagesWithContent.map((message) => ({
                role: message.role,
                content: message.content,
                createdAt: message.createdAt,
            })),
        );
    }

    async prepareNewChat(
        userId: string,
        question: string,
        titlePrompt?: string,
    ) {
        const normalizedQuestion = question.trim();
        const normalizedTitlePrompt = titlePrompt?.trim();

        const chat = await this.createChat(userId);

        const savedMessage = await this.saveUserMessage(
            chat.id,
            normalizedQuestion,
        );

        const promptForTitle = normalizedQuestion || normalizedTitlePrompt;

        if (promptForTitle) {
            void this.generateAndUpdateChatTitle(
                chat,
                promptForTitle,
            );
        }

        return {
            ...chat,
            messageId: savedMessage.id,
        };
    }

    private async generateAndUpdateChatTitle(
        chat: Chat,
        question: string,
    ): Promise<void> {
        try {
            const title = await this.generateUniqueChatTitle(
                question,
                chat.id,
                chat.userId,
            );
    
            const result = await this.chatRepository.update(
                {
                    id: chat.id,
                    userId: chat.userId,
                    title: DEFAULT_CHAT_TITLE,
                },
                {
                    title,
                    updatedAt: new Date(),
                },
            );

        } catch (error) {
            console.error('Failed to generate chat title:', error);
        }
    }

    async startGeneration(
        chatId: string,
        userId: string,
        question: string,
        userMessageAlreadySaved = false,
    ) {
        const normalizedQuestion = question.trim();
    
        if (!normalizedQuestion) {
            throw new BadRequestException('Question cannot be empty');
        }
    
        await this.getChatOrFail(chatId, userId);
    
        if (!userMessageAlreadySaved) {
            await this.saveUserMessage(chatId, normalizedQuestion);
        }
    
        const task = this.generationTaskRepository.create({
            chatId,
            userId,
            question: normalizedQuestion,
            status: 'pending',
            error: null,
        });
    
        const savedTask = await this.generationTaskRepository.save(task);
    
        void this.processGenerationTask(savedTask.id);
    
        return {
            taskId: savedTask.id,
            chatId,
            status: savedTask.status,
        };
    }
    
    
    private async processGenerationTask(taskId: string): Promise<void> {
        const controller = new AbortController();

        this.generationControllers.set(taskId, controller);

        try {
            const task = await this.generationTaskRepository.findOne({
                where: { id: taskId },
            });

            if (!task || task.status === 'cancelled') return;

            const updateResult = await this.generationTaskRepository.update(
                { id: taskId, status: 'pending' },
                { status: 'processing' },
            );

            if (!updateResult.affected) return;

            let historyOverride: BaseMessage[] | undefined;

            if (task.regenerateMessageId) {
                const messages = await this.messageRepository.find({
                    where: { chatId: task.chatId },
                    order: { createdAt: 'ASC' },
                });

                const messageIndex = messages.findIndex(
                    (message) => message.id === task.regenerateMessageId,
                );

                if (
                    messageIndex === -1 ||
                    messages[messageIndex].role !== 'assistant'
                ) {
                    throw new NotFoundException('Assistant message not found');
                }

                historyOverride = messages
                    .slice(Math.max(0, messageIndex - HISTORY_LIMIT), messageIndex)
                    .map((message) => {
                        if (message.role === 'user') {
                            return new HumanMessage(message.content);
                        }

                        return new AIMessage(message.content);
                    });
            }

            const result = await this.query(
                task.chatId,
                task.userId,
                task.question,
                controller.signal,
                historyOverride,
                true,
                task.regenerateMessageId ?? undefined,
            );

            if (!result.success) {
                throw new Error(result.message || 'Generation failed');
            }

            await this.generationTaskRepository.update(
                { id: taskId, status: 'processing' },
                {
                    status: 'completed',
                    error: null,
                },
            );
        } catch (error) {
            const task = await this.generationTaskRepository.findOne({
                where: { id: taskId },
            });

            if (task?.status !== 'cancelled') {
                console.error('Generation task failed:', error);

                await this.generationTaskRepository.update(taskId, {
                    status: 'failed',
                    error: error instanceof Error
                        ? error.message
                        : 'Unknown generation error',
                });
            }
        } finally {
            this.generationControllers.delete(taskId);
        }
    }

    async getActiveGenerationTasks(userId: string) {
        return this.generationTaskRepository.find({
            where: [
                { userId, status: 'pending' },
                { userId, status: 'processing' },
            ],
            order: {
                createdAt: 'ASC',
            },
        });
    }

    async getGenerationTask(taskId: string, userId: string) {
        const task = await this.generationTaskRepository.findOne({
            where: {
                id: taskId,
                userId,
            },
        });
    
        if (!task) {
            throw new NotFoundException('Generation task not found');
        }
    
        return task;
    }

    async cancelGenerationTask(taskId: string, userId: string) {
        const task = await this.generationTaskRepository.findOne({
            where: {
                id: taskId,
                userId,
            },
        });
    
        if (!task) {
            throw new NotFoundException('Generation task not found');
        }
    
        if (task.status !== 'pending' && task.status !== 'processing') {
            return task;
        }
    
        await this.generationTaskRepository.update(taskId, {
            status: 'cancelled',
        });
    
        this.generationControllers.get(taskId)?.abort();
    
        return {
            taskId,
            status: 'cancelled',
        };
    }

    async startRegeneration(
        chatId: string,
        userId: string,
        assistantMessageId: string,
    ) {
        const chat = await this.getChatOrFail(chatId, userId);
    
        const messages = await this.messageRepository.find({
            where: { chatId },
            order: { createdAt: 'ASC' },
        });
    
        const messageIndex = messages.findIndex(
            (message) => message.id === assistantMessageId,
        );
    
        if (
            messageIndex === -1 ||
            messages[messageIndex].role !== 'assistant' ||
            messageIndex === 0 ||
            messages[messageIndex - 1].role !== 'user'
        ) {
            throw new NotFoundException('Assistant message not found');
        }
    
        const question = messages[messageIndex - 1].content;
    
        const messagesToDelete = messages.slice(messageIndex + 1);
    
        if (messagesToDelete.length > 0) {
            await this.messageRepository.delete({
                chatId,
                id: In(messagesToDelete.map((message) => message.id)),
            });
    
            await this.rebuildChatVectorIndex(
                chatId,
                userId,
                chat.title,
            );
        }
    
        const task = this.generationTaskRepository.create({
            chatId,
            userId,
            question,
            regenerateMessageId: assistantMessageId,
            status: 'pending',
            error: null,
        });
    
        const savedTask = await this.generationTaskRepository.save(task);
    
        void this.processGenerationTask(savedTask.id);
    
        return {
            taskId: savedTask.id,
            chatId,
            status: savedTask.status,
        };
    }

    async deleteMessage(
        chatId: string,
        userId: string,
        messageId: string,
      ) {
        const chat = await this.getChatOrFail(chatId, userId);
      
        const messages = await this.messageRepository.find({
          where: { chatId },
          order: { createdAt: 'ASC' },
        });
      
        const messageIndex = messages.findIndex(
          (message) => message.id === messageId,
        );
      
        if (messageIndex === -1 || messages[messageIndex].role !== 'user') {
          throw new NotFoundException('User message not found');
        }
      
        const messagesToDelete = messages.slice(messageIndex);
      
        await this.messageRepository.delete({
          chatId,
          id: In(messagesToDelete.map((message) => message.id)),
        });
      
        await this.rebuildChatVectorIndex(chatId, userId, chat.title);
        await this.touchChat(chat);
      
        return {
          success: true,
          message: 'Message and following messages deleted',
        };
      }

      async createUserMessage(
        chatId: string,
        userId: string,
        question: string,
    ) {
        const normalizedQuestion = question.trim();
    
        await this.getChatOrFail(chatId, userId);
    
        return this.saveUserMessage(chatId, normalizedQuestion);
    }
}
