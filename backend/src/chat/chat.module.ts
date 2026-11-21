import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { IngestService } from './ingest.service';
import { LlmService } from './llm.service';
import { VectorStoreService } from './vector-store.service';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { ChatFile } from './entities/chat-file.entity';
import { FileGenerationService } from './file-generation.service';
import { StorageService } from './storage.service';
import { ImageGenerationService } from './image-generation.service';
import { HttpModule } from '@nestjs/axios';
import { PdfGenerationService } from './pdf-generation.service';
import { ExcelGenerationService } from './excel-generation.service';
import { WebSearchService } from './web-search.service';
import { GenerationTask } from './entities/generation-task.entity';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Chat, Message, ChatFile, GenerationTask])],
  controllers: [ChatController],
  providers: [
    ChatService,
    IngestService,
    LlmService,
    VectorStoreService,
    FileGenerationService,
    StorageService,
    ImageGenerationService,
    PdfGenerationService,
    ExcelGenerationService,
    WebSearchService,
  ],
})
export class ChatModule {}
