import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    ParseUUIDPipe,
    UseInterceptors,
    UploadedFiles,
    UseGuards,
    Patch,
    Delete,
    Req,
    Res,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { IngestService } from './ingest.service';
import { IngestBodyDto } from './dto/ingest-body.dto';
import { AskDto } from './dto/ask.dto';
import { CreateChatDto } from './dto/create-chat.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { multerOptions } from './config/multer.config';
import { MAX_FILES_PER_UPLOAD } from './constants/chat.constants';
import type { AuthenticatedRequest } from './types/authentification-request';
import JwtRefreshGuard from '../authentication/jwt-strategy/jwt-refresh.guard';
import type { Response } from 'express';

@Controller('chat')
@UseGuards(JwtRefreshGuard)
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly ingestService: IngestService,
    ) {}

    @Post()
    createChat(
        @Req() req: AuthenticatedRequest,
        @Body() body: CreateChatDto,
    ) {
        return this.chatService.createChat(
            req.user.id,
            body?.title,
        );
    }

    @Get()
    getChats(@Req() req: AuthenticatedRequest) {
        return this.chatService.getChats(req.user.id);
    }

    @Get(':chatId/messages')
    getMessages(
        @Req() req: AuthenticatedRequest,
        @Param('chatId', ParseUUIDPipe) chatId: string,
    ) {
        return this.chatService.getMessages(chatId, req.user.id);
    }

    @Get('generation/active')
    getActiveGenerationTasks(@Req() req: AuthenticatedRequest) {
        return this.chatService.getActiveGenerationTasks(req.user.id);
    }

    @Get('generation/:taskId')
    getGenerationTask(
        @Req() req: AuthenticatedRequest,
        @Param('taskId', ParseUUIDPipe) taskId: string,
    ) {
        return this.chatService.getGenerationTask(taskId, req.user.id);
    }

    @Post(':chatId/messages/:messageId/regenerate')
    startRegeneration(
        @Req() req: AuthenticatedRequest,
        @Param('chatId', ParseUUIDPipe) chatId: string,
        @Param('messageId', ParseUUIDPipe) messageId: string,
    ) {
        return this.chatService.startRegeneration(chatId, req.user.id, messageId);
    }

    @Post('generation/:taskId/cancel')
    cancelGenerationTask(
        @Req() req: AuthenticatedRequest,
        @Param('taskId', ParseUUIDPipe) taskId: string,
    ) {
        return this.chatService.cancelGenerationTask(taskId, req.user.id);
    }

    @Post(':chatId/generation')
    startGeneration(
        @Req() req: AuthenticatedRequest,
        @Param('chatId', ParseUUIDPipe) chatId: string,
        @Body() body: AskDto,
    ) {
        return this.chatService.startGeneration(
            chatId,
            req.user.id,
            body?.question || '',
            body?.userMessageAlreadySaved === true,
        );
    }

    @Post(':chatId/ingest')
    ingest(
        @Req() req: AuthenticatedRequest,
        @Param('chatId', ParseUUIDPipe) chatId: string,
        @Body() body: IngestBodyDto,
    ) {
        return this.ingestService.ingest(chatId, req.user.id, body || {});
    }

    @Post(':chatId/upload')
    @UseInterceptors(
        FilesInterceptor('files', MAX_FILES_PER_UPLOAD, multerOptions),
    )
    uploadAndIngest(
        @Req() req: AuthenticatedRequest,
        @Param('chatId', ParseUUIDPipe) chatId: string,
        @UploadedFiles() files: Express.Multer.File[],
        @Body('messageId') messageId: string,
    ) {
        return this.ingestService.handleFileUpload(
            chatId,
            req.user.id,
            files,
            messageId,
        );
    }

    @Post(':chatId/ask')
    async ask(
        @Req() req: AuthenticatedRequest,
        @Res({ passthrough: true }) res: Response,
        @Param('chatId', ParseUUIDPipe) chatId: string,
        @Body() body: AskDto,
    ) {
        const controller = new AbortController();

        const handleClose = () => {
            if (!res.writableEnded) controller.abort();
        };

        res.on('close', handleClose);

        try {
            return await this.chatService.query(
                chatId,
                req.user.id,
                body?.question || '',
                controller.signal,
                undefined,
                body?.userMessageAlreadySaved === true,
            );
        } finally {
            res.off('close', handleClose);
        }
    }

    @Post('ask')
    async askNewChat(
        @Req() req: AuthenticatedRequest,
        @Res({ passthrough: true }) res: Response,
        @Body() body: AskDto,
    ) {
        const controller = new AbortController();

        const handleClose = () => {
            if (!res.writableEnded) controller.abort();
        };

        res.on('close', handleClose);

        try {
            return await this.chatService.queryNewChat(
                req.user.id,
                body?.question || '',
                controller.signal,
            );
        } finally {
            res.off('close', handleClose);
        }
    }

    @Post('prepare')
    prepareNewChat(
        @Req() req: AuthenticatedRequest,
        @Body() body: CreateMessageDto,
    ) {
        return this.chatService.prepareNewChat(
            req.user.id,
            body?.question || '',
            body?.titlePrompt || '',
        );
    }

    @Patch(':chatId/title')
    updateChatTitle(
        @Req() req: AuthenticatedRequest,
        @Param('chatId', ParseUUIDPipe) chatId: string,
        @Body('title') title: string,
    ) {
        return this.chatService.updateChatTitle(chatId, req.user.id, title);
    }

    @Patch(':chatId/messages/:messageId')
    async editMessage(
        @Req() req: AuthenticatedRequest,
        @Res({ passthrough: true }) res: Response,
        @Param('chatId', ParseUUIDPipe) chatId: string,
        @Param('messageId', ParseUUIDPipe) messageId: string,
        @Body() body: AskDto,
    ) {
        const controller = new AbortController();

        const handleClose = () => {
            if (!res.writableEnded) controller.abort();
        };

        res.on('close', handleClose);

        try {
            return await this.chatService.editMessage(
                chatId,
                req.user.id,
                messageId,
                body.question,
                controller.signal,
            );
        } finally {
            res.off('close', handleClose);
        }
    }

    @Delete(':chatId')
    deleteChat(
        @Req() req: AuthenticatedRequest,
        @Param('chatId', ParseUUIDPipe) chatId: string,
    ) {
        return this.chatService.deleteChat(chatId, req.user.id);
    }

    @Delete(':chatId/messages/:messageId')
    deleteMessage(
        @Req() req: AuthenticatedRequest,
        @Param('chatId', ParseUUIDPipe) chatId: string,
        @Param('messageId', ParseUUIDPipe) messageId: string,
    ) {
        return this.chatService.deleteMessage(chatId, req.user.id, messageId);
    }

    @Get(':chatId/files')
    getChatFiles(
        @Req() req: AuthenticatedRequest,
        @Param('chatId', ParseUUIDPipe) chatId: string,
    ) {
        return this.ingestService.getChatFiles(chatId, req.user.id);
    }

    @Post(':chatId/messages')
    createUserMessage(
        @Req() req: AuthenticatedRequest,
        @Param('chatId', ParseUUIDPipe) chatId: string,
        @Body() body: CreateMessageDto,
    ) {
        return this.chatService.createUserMessage(
            chatId,
            req.user.id,
            body.question,
        );
    }
}
