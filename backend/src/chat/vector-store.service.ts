import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OllamaEmbeddings } from '@langchain/ollama';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { Document } from '@langchain/core/documents';

import { splitDocuments } from './helper/text-splitter.helper';
import {
    toSimilarity,
    VectorScore,
} from './helper/rag.helper';

import {
    MIN_RELEVANCE_SCORE,
    RETRIEVAL_TOP_K,
    VECTOR_TABLE_NAME,
} from './constants/chat.constants';
import { DataSource } from 'typeorm';

@Injectable()
export class VectorStoreService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(VectorStoreService.name);

    private readonly embeddings: OllamaEmbeddings;
    private vectorStore!: PGVectorStore;

    constructor(
        private readonly configService: ConfigService,
        private readonly dataSource: DataSource,
    ) {
        this.embeddings = new OllamaEmbeddings({
            model: this.configService.get<string>('OLLAMA_MODEL'),
            baseUrl: this.configService.get<string>('OLLAMA_BASE_URL'),
        });
    }

    async onModuleInit(): Promise<void> {
        this.vectorStore = await PGVectorStore.initialize(
            this.embeddings,
            {
                postgresConnectionOptions: {
                    host: this.configService.get<string>('POSTGRES_HOST'),
                    port: Number(
                        this.configService.get('POSTGRES_PORT'),
                    ),
                    user: this.configService.get<string>('POSTGRES_USER'),
                    password: this.configService.get<string>(
                        'POSTGRES_PASSWORD',
                    ),
                    database: this.configService.get<string>('POSTGRES_DB'),
                },

                tableName: VECTOR_TABLE_NAME,

                columns: {
                    idColumnName: 'id',
                    vectorColumnName: 'vector',
                    contentColumnName: 'content',
                    metadataColumnName: 'metadata',
                },

                distanceStrategy: 'cosine',
            },
        );
    }

    async onModuleDestroy(): Promise<void> {
        await this.vectorStore?.end();
    }

    async addDocuments(
        chatId: string,
        docs: Document[],
        fileId?: string,
    ): Promise<number> {
        const splitDocs = await splitDocuments(docs);

        const docsWithMeta = splitDocs.map((doc) => {
            return new Document({
                pageContent: doc.pageContent,
                metadata: {
                    ...doc.metadata,
                    chatId,
                    ...(fileId && { fileId }),
                },
            });
        });

        await this.vectorStore.addDocuments(docsWithMeta);

        return docsWithMeta.length;
    }

    async searchRelevant(
        chatId: string,
        question: string,
    ): Promise<Document[]> {
        const scoredDocs =
            await this.vectorStore.similaritySearchWithScore(
                question,
                RETRIEVAL_TOP_K,
                { chatId },
            );

        const relevantDocs = scoredDocs
            .map(([doc, score]) => ({
                doc,
                similarity: toSimilarity(score as VectorScore),
            }))
            .filter(
                ({ similarity }) =>
                    similarity >= MIN_RELEVANCE_SCORE,
            )
            .sort(
                (a, b) =>
                    b.similarity - a.similarity,
            );

        return relevantDocs.map(({ doc }) => doc);
    }

    async addChatMessages(
        userId: string,
        chatId: string,
        chatTitle: string,
        messages: {
            role: string;
            content: string;
            createdAt: Date;
        }[],
    ): Promise<number> {
        const docs = messages
            .filter((message) => message.content.trim().length > 0)
            .map(
                (message) =>
                    new Document({
                        pageContent: message.content.slice(0, 2000),
                        metadata: {
                            userId,
                            chatId,
                            chatTitle,
                            role: message.role,
                            createdAt: message.createdAt,
                            type: 'chat_message',
                        },
                    }),
            );
    
        if (docs.length === 0) {
            return 0;
        }
    
        const splitDocs = await splitDocuments(docs);
    
        await this.vectorStore.addDocuments(splitDocs);
    
        return splitDocs.length;
    }

    async searchChatMessages(
        userId: string,
        question: string,
    ): Promise<Document[]> {
        const scoredDocs =
            await this.vectorStore.similaritySearchWithScore(
                question.slice(0, 1000),
                RETRIEVAL_TOP_K,
                {
                    userId,
                    type: 'chat_message',
                },
            );
    
        const relevantDocs = scoredDocs
            .map(([doc, score]) => ({
                doc,
                similarity: toSimilarity(score as VectorScore),
            }))
            .filter(
                ({ similarity }) =>
                    similarity >= MIN_RELEVANCE_SCORE,
            )
            .sort(
                (a, b) =>
                    b.similarity - a.similarity,
            );
    
        return relevantDocs.map(({ doc }) => doc);
    }

    async deleteByChatId(chatId: string): Promise<void> {
        await this.dataSource.query(
            `
            DELETE FROM "${VECTOR_TABLE_NAME}"
            WHERE metadata->>'chatId' = $1
            `,
            [chatId],
        );
    }
    
    async deleteChatMessagesByChatId(chatId: string): Promise<void> {
        await this.dataSource.query(
            `
            DELETE FROM "${VECTOR_TABLE_NAME}"
            WHERE metadata->>'chatId' = $1
            AND metadata->>'type' = 'chat_message'
            `,
            [chatId],
        );
    }
}
