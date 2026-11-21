import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '@langchain/core/documents';
import { unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { extname } from 'path';

import { IngestBodyDto } from './dto/ingest-body.dto';
import { ChatFile } from './entities/chat-file.entity';
import { ChatService } from './chat.service';
import { LlmService } from './llm.service';
import { VectorStoreService } from './vector-store.service';
import { randomUUID } from 'crypto';

import {
    loadFileAsDocuments,
    isImage,
} from './helper/file.loader';

import { Message } from './entities/message.entity';



@Injectable()
export class IngestService {
    constructor(
        @InjectRepository(ChatFile)
        private readonly chatFileRepository: Repository<ChatFile>,
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,    
        private readonly chatService: ChatService,
        private readonly llmService: LlmService,
        private readonly vectorStoreService: VectorStoreService,
    ) {}

    async handleFileUpload(
        chatId: string,
        userId: string,
        files: Express.Multer.File[] = [],
        messageId: string,
    ) {
        try {
            await this.chatService.getChatOrFail(chatId, userId);
    
            if (!messageId) {
                throw new BadRequestException('Message ID is required');
            }
    
            const message = await this.messageRepository.findOne({
                where: {
                    id: messageId,
                    chatId,
                    role: 'user',
                },
            });
    
            if (!message) {
                throw new NotFoundException('User message not found');
            }
    
            if (files.length === 0) {
                return {
                    success: false,
                    message: 'No files uploaded',
                    chunksAdded: 0,
                };
            }
    
            const savedFiles: ChatFile[] = [];
    
            for (const file of files) {
                const savedFile = await this.ingestFile(
                    chatId,
                    messageId,
                    file,
                );
    
                savedFiles.push(savedFile);
            }
    
            const chunksAdded = savedFiles.reduce(
                (sum, file) => sum + file.chunksCount,
                0,
            );
    
            return {
                success: true,
                message: 'Files uploaded',
                chunksAdded,
                filesProcessed: savedFiles.length,
                files: savedFiles,
            };
        } finally {
            await Promise.all(
                files.map((file) =>
                    file.path
                        ? unlink(file.path).catch(() => undefined)
                        : Promise.resolve(),
                ),
            );
        }
    }

    async ingest(chatId: string, userId: string, body: IngestBodyDto) {
        await this.chatService.getChatOrFail(chatId, userId);

        const textDocs: Document[] = (body.docs || []).map(
            (doc) =>
                new Document({
                    pageContent: doc.content,
                    metadata: {
                        source: doc.meta?.source ?? 'inline',
                        ...doc.meta,
                    },
                }),
        );

        if (textDocs.length === 0) {
            return {
                success: false,
                message: 'No documents provided',
                chunksAdded: 0,
            };
        }

        const chunksAdded = await this.vectorStoreService.addDocuments(
            chatId,
            textDocs,
        );

        return {
            success: true,
            message: 'Documents ingested',
            chunksAdded,
            documentIngested: textDocs.length,
        };
    }

    private async ingestFile(
        chatId: string,
        messageId: string,
        file: Express.Multer.File,
    ): Promise<ChatFile> {
        const originalName = Buffer.from(
            file.originalname,
            'latin1',
        ).toString('utf8');
        
        const extension = extname(originalName).toLowerCase();

        const chatFile = await this.chatFileRepository.save(
            this.chatFileRepository.create({
                chatId,
                messageId,
                originalName,
                mimeType: file.mimetype,
                size: file.size,
                chunksCount: 0,
                storageKey: null,
            }),
        );
    
        const tempFilePath = join(
            tmpdir(),
            `${randomUUID()}${extension}`,
        );
    
        try {
            await writeFile(tempFilePath, file.buffer);
    
            const docs = await this.fileToDocuments(
                tempFilePath,
                originalName,
                file.buffer,
            );
    
            chatFile.chunksCount =
                await this.vectorStoreService.addDocuments(
                    chatId,
                    docs,
                    chatFile.id,
                );
    
            return await this.chatFileRepository.save(chatFile);
        } catch (error) {
            await this.chatFileRepository.delete(chatFile.id);
            throw error;
        } finally {
            await unlink(tempFilePath).catch(() => undefined);
        }
    }

    private async fileToDocuments(
        filePath: string,
        sourceName: string,
        fileBuffer: Buffer,
    ): Promise<Document[]> {
        if (isImage(sourceName)) {
            const description = await this.llmService.describeImage(filePath);
    
            return [
                new Document({
                    pageContent: description,
                    metadata: {
                        source: sourceName,
                        type: 'image',
                    },
                }),
            ];
        }
    
        return loadFileAsDocuments(filePath, sourceName);
    }

    async getChatFiles(chatId: string, userId: string) {
        await this.chatService.getChatOrFail(chatId, userId);
    
        return this.chatFileRepository.find({
            where: { chatId },
            order: { createdAt: 'ASC' },
        });
    }
}
