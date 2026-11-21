import api from './axios';

import type {
  Chat,
  Message,
  CreateChatData,
  UpdateChatTitleData,
  SendMessageData,
  ChatResponse,
  GenerationTaskStatus,
  GenerationTask,
  UploadFilesResponse,
  ChatFile,
  PrepareNewChatResponse,
} from '../types/chat.types';

export const getChats = async () => {
  const response = await api.get<Chat[]>('/chat');
  return response.data;
};

export const createChat = async (data?: CreateChatData) => {
  const response = await api.post<Chat>('/chat', data || {});
  return response.data;
};

export const prepareNewChat = async (
  data: SendMessageData & { titlePrompt?: string },
): Promise<PrepareNewChatResponse> => {
  const response = await api.post<PrepareNewChatResponse>(
    '/chat/prepare',
    data,
  );

  return response.data;
};

export const getChatMessages = async (chatId: string) => {
  const response = await api.get<Message[]>(
    `/chat/${chatId}/messages`,
  );

  return response.data;
};

export const sendMessage = async (
  chatId: string,
  data: SendMessageData,
  signal?: AbortSignal,
) => {
  const response = await api.post(
    `/chat/${chatId}/ask`,
    data,
    { signal },
  );

  return response.data;
};

export const updateChatTitle = async (
  chatId: string,
  data: UpdateChatTitleData,
) => {
  const response = await api.patch(
    `/chat/${chatId}/title`,
    data,
  );

  return response.data;
};

export const editMessage = async (
  chatId: string,
  messageId: string,
  data: SendMessageData,
  signal?: AbortSignal,
) => {
  const response = await api.patch<ChatResponse>(
    `/chat/${chatId}/messages/${messageId}`,
    data,
    { signal },
  );

  return response.data;
};

export const deleteChat = async (chatId: string) => {
  const response = await api.delete(
    `/chat/${chatId}`,
  );

  return response.data;
};

export const startGeneration = async (
  chatId: string,
  data: SendMessageData,
) => {
  const response = await api.post<{
    taskId: string;
    chatId: string;
    status: GenerationTaskStatus;
  }>(`/chat/${chatId}/generation`, data);

  return response.data;
};

export const getActiveGenerationTasks = async () => {
  const response = await api.get<GenerationTask[]>(
    '/chat/generation/active',
  );

  return response.data;
};

export const getGenerationTask = async (taskId: string) => {
  const response = await api.get<GenerationTask>(
    `/chat/generation/${taskId}`,
  );

  return response.data;
};

export const cancelGeneration = async (taskId: string) => {
  const response = await api.post(
    `/chat/generation/${taskId}/cancel`,
  );

  return response.data;
};

export const regenerateMessage = async (
  chatId: string,
  messageId: string,
) => {
  const response = await api.post<{
    taskId: string;
    chatId: string;
    status: GenerationTaskStatus;
  }>(
    `/chat/${chatId}/messages/${messageId}/regenerate`,
  );

  return response.data;
};

export const deleteMessage = async (
  chatId: string,
  messageId: string,
) => {
  const response = await api.delete(
    `/chat/${chatId}/messages/${messageId}`,
  );

  return response.data;
};

export const uploadChatFiles = async (
  chatId: string,
  files: File[],
  messageId: string,
) => {
  const formData = new FormData();

  formData.append('messageId', messageId);

  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await api.post<UploadFilesResponse>(
    `/chat/${chatId}/upload`,
    formData,
  );

  return response.data;
};

export const getChatFiles = async (chatId: string) => {
  const response = await api.get<ChatFile[]>(
    `/chat/${chatId}/files`,
  );

  return response.data;
};

export const createUserMessage = async (
  chatId: string,
  data: SendMessageData,
) => {
  const response = await api.post<Message>(
    `/chat/${chatId}/messages`,
    data,
  );

  return response.data;
};
