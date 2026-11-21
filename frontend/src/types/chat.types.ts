import type { User } from "./authentication.types";

export interface Chat {
    id: string;
    title: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Message {
    id: string;
    chatId: string;
    role: 'user' | 'assistant';
    content: string;
    sources: string[] | null;
    createdAt: string;
    localFiles?: File[];
  }
  
  export interface CreateChatData {
    title?: string;
  }
  
  export interface UpdateChatTitleData {
    title: string;
  }
  
  export interface ChatResponse {
    success: boolean;
    chatId?: string;
    answer: string;
    sources?: string[];
    contextCount?: number;
    mode?:
      | 'rag'
      | 'general'
      | 'file-generation'
      | 'image-generation'
      | 'chat-history'
      | 'web-search';
    fileName?: string;
    downloadUrl?: string;
    imageUrl?: string;
    imageFileName?: string;
    message?: string;
  }

  export interface ChatWindowProps {
    user: User;
    activeChatId: string | null;
    messages: Message[];
    isSending: boolean;
    regeneratingMessageId: string | null;
    isLoadingMessages: boolean;
    isDeletingMessage: boolean;
    isStopping: boolean;
    chatFiles: ChatFile[];
    onSend: (message: string, files: File[]) => void;
    onStop: () => void;
    onEdit: (messageId: string, question: string) => void;
    onRegenerate: (messageId: string) => void;
    onDeleteMessage: (messageId: string) => void;
}

  export interface ChatSidebarProps {
    user: User;
    chats: Chat[];
    activeChatId: string | null;
    isLoadingChats: boolean;
    isCreatingChat: boolean;
    onNewChat: () => void;
    onSelectChat: (chatId: string) => void;
    onRenameChat: (chat: Chat) => void;
    onDeleteChat: (chatId: string) => void;
    onLogout: () => void;
    onToggle: () => void;
  }

  export interface SendMessageData {
    question: string;
    userMessageAlreadySaved?: boolean;
  }

  export interface GenerationTask {
    id: string;
    chatId: string;
    userId: string;
    question: string;
    regenerateMessageId: string | null;
    status: GenerationTaskStatus;
    error: string | null;
    createdAt: string;
    updatedAt: string;
  }

  export type ChatDialog =
  | { type: 'rename'; chat: Chat }
  | { type: 'delete'; chatId: string }
  | { type: 'delete-message'; messageId: string }
  | { type: 'delete-chat-from-message'; chatId: string }
  | null;
  
  export type GenerationTaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

  export interface UploadedChatFile {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    chunksCount: number;
    storageKey: string | null;
  }
  
  export interface UploadFilesResponse {
    success: boolean;
    message: string;
    chunksAdded: number;
    filesProcessed: number;
    files: UploadedChatFile[];
  }

  export interface ChatFile {
    id: string;
    chatId: string;
    messageId: string | null;
    originalName: string;
    mimeType: string;
    size: number;
    chunksCount: number;
    createdAt: string;
    storageKey: string | null;
  }

  export interface PrepareNewChatResponse extends Chat {
    messageId: string;
  }
