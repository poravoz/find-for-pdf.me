import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PanelLeftOpen, X } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { TRANSLATIONS } from '../../constants/translations';
import { useNotification } from '../../context/NotificationContext';

import {
  getChats,
  getChatMessages,
  startGeneration,
  getActiveGenerationTasks,
  getGenerationTask,
  prepareNewChat,
  createUserMessage,
  editMessage,
  deleteChat,
  deleteMessage,
  updateChatTitle,
  cancelGeneration,
  regenerateMessage,
  uploadChatFiles,
  getChatFiles,
} from '../../api/chat.api';

import type {
  GenerationTask,
  ChatFile,
} from '../../types/chat.types';

import type { Chat, ChatDialog, Message } from '../../types/chat.types';

import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatWindow from '../../components/chat/ChatWindow';
import './home.css';

function HomePage() {
  const { user, isLoading, logout } = useAuth();
  const { language } = useLanguage();
  const t = TRANSLATIONS[language];
  const navigate = useNavigate();
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const { showNotification } = useNotification();
  const hasUntitledChats = chats.some(
    (chat) => chat.title === 'New chat',
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const hasRestoredChatRef = useRef(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [generatingChatIds, setGeneratingChatIds] = useState<Set<string>>(
    new Set(),
  );
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([]);
  const filesRequestIdRef = useRef(0);
  const deletingMessageRef = useRef(false);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const operationsRef = useRef<Set<string>>(new Set());
  const activeChatIdRef = useRef<string | null>(null);
  const viewRequestIdRef = useRef(0); 
  const generationTasksRef = useRef<Map<string, string>>(new Map());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [dialog, setDialog] = useState<ChatDialog>(null);
  const [newChatTitle, setNewChatTitle] = useState('');
  const messagesRequestIdRef = useRef(0);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [stoppingChatIds, setStoppingChatIds] = useState<Set<string>>(
    new Set(),
  );
  
  const [isCreatingChatStopping, setIsCreatingChatStopping] = useState(false);
  
  const pendingStopChatIdsRef = useRef<Set<string>>(new Set());
  const stopNewChatRequestedRef = useRef(false);

  useEffect(() => {
    if (!dialog) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDialog();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dialog]);

  const loadChats = useCallback(async () => {
    try {
      const data = await getChats();
      updateChats(data);
    } catch (error) {
      console.error('Failed to load chats:', error);
      showNotification('error', t.loadChatsError);
    } finally {
      setIsLoadingChats(false);
    }
  }, [t.loadChatsError, showNotification]);

  const waitForGeneration = async (
    taskId: string,
    chatId: string,
  ) => {
    let isFinished = false;
  
    while (!isFinished) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
  
        const task = await getGenerationTask(taskId);
  
        if (
          task.status === 'completed' ||
          task.status === 'failed' ||
          task.status === 'cancelled'
        ) {
          isFinished = true;
  
          generationTasksRef.current.delete(chatId);
          operationsRef.current.delete(chatId);
  
          const updatedMessages = await getChatMessages(chatId);
  
          if (activeChatIdRef.current === chatId) {
            setMessages(updatedMessages);
          }
  
          setRegeneratingMessageId(null);
  
          if (task.status === 'failed') {
            console.error('Generation failed:', task.error);
            showNotification('error', t.sendMessageError);
          }
  
          void loadChats();
  
          setGeneratingChatIds((current) => {
            const next = new Set(current);
            next.delete(chatId);
            return next;
          });
  
          setStoppingChatIds((current) => {
            const next = new Set(current);
            next.delete(chatId);
            return next;
          });
  
          setIsCreatingChatStopping(false);
        }
      } catch (error) {
        console.error('Failed to check generation status. Retrying:', error);
      }
    }
  };
  
  const loadMessages = useCallback(async (chatId: string) => {
    const requestId = ++messagesRequestIdRef.current;
  
    setIsLoadingMessages(true);
  
    try {
      const data = await getChatMessages(chatId);
  
      if (
        messagesRequestIdRef.current === requestId &&
        activeChatIdRef.current === chatId
      ) {
        setMessages(data);
      }
    } catch (error) {
      if (messagesRequestIdRef.current === requestId) {
        console.error('Failed to load messages:', error);
        setMessages([]);
        showNotification('error', t.loadMessagesError);
      }
    } finally {
      if (messagesRequestIdRef.current === requestId) {
        setIsLoadingMessages(false);
      }
    }
  }, [t.loadChatsError, showNotification]);

  const loadChatFiles = useCallback(async (chatId: string) => {
    const requestId = ++filesRequestIdRef.current;
  
    try {
      const data = await getChatFiles(chatId);
  
      console.log('[FILES] Loaded from API:', data);
      console.log('[FILES] Active chat:', activeChatIdRef.current);
      console.log('[FILES] Requested chat:', chatId);
  
      if (
        filesRequestIdRef.current === requestId &&
        activeChatIdRef.current === chatId
      ) {
        console.log('[FILES] Updating chatFiles state');
        setChatFiles(data);
      }
    } catch (error) {
      console.error('[FILES] Failed to load:', error);
  
      if (filesRequestIdRef.current === requestId) {
        setChatFiles([]);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user, loadChats]);

  const closeSidebarOnMobile = () => {
    if (window.matchMedia('(max-width: 700px)').matches) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    if (!user) return;
  
    const restoreGenerationTasks = async () => {
      try {
        const tasks: GenerationTask[] =
          await getActiveGenerationTasks();
  
        for (const task of tasks) {
          generationTasksRef.current.set(task.chatId, task.id);
  
          setGeneratingChatIds((current) =>
            new Set(current).add(task.chatId),
          );
  
          void waitForGeneration(task.id, task.chatId);
        }
      } catch (error) {
        console.error('Failed to restore generation tasks:', error);
      }
    };
  
    void restoreGenerationTasks();
  }, [user]);

  useEffect(() => {
    if (!hasUntitledChats) return;

    const interval = setInterval(async () => {
      try {
        const updatedChats = await getChats();
        updateChats(updatedChats);
      } catch (error) {
        console.error('Failed to update chat titles:', error);
      }
    }, 1500);

    return () => {
      clearInterval(interval);
    };
  }, [hasUntitledChats]);

  const updateChats = (updatedChats: Chat[]) => {
    setChats((currentChats) =>
      updatedChats.map((updatedChat) => {
        const currentChat = currentChats.find(
          (chat) => chat.id === updatedChat.id,
        );
  
        if (
          currentChat &&
          currentChat.title !== 'New chat' &&
          updatedChat.title === 'New chat'
        ) {
          return {
            ...updatedChat,
            title: currentChat.title,
          };
        }
  
        return updatedChat;
      }),
    );
  };

  const handleNewChat = () => {
    viewRequestIdRef.current++;
    messagesRequestIdRef.current++;
    activeChatIdRef.current = null;

    localStorage.removeItem(
      `ai-studio-active-chat-${user.id}`,
    );

    setActiveChatId(null);
    setMessages([]);
    setIsLoadingMessages(false);
    setIsCreatingChat(false);
    filesRequestIdRef.current++;
    setChatFiles([]);
    closeSidebarOnMobile();
  };

  const handleSelectChat = async (chatId: string) => {
    if (chatId === activeChatIdRef.current) {
      closeSidebarOnMobile();
      return;
    }
  
    viewRequestIdRef.current++;
    activeChatIdRef.current = chatId;
    setActiveChatId(chatId);
  
    localStorage.setItem(
      `ai-studio-active-chat-${user.id}`,
      chatId,
    );
  
    setMessages([]);
    setChatFiles([]);
    setIsCreatingChat(false);
  
    void loadChatFiles(chatId);
    await loadMessages(chatId);
  
    closeSidebarOnMobile();
  };

  useEffect(() => {
    if (!user || isLoadingChats || hasRestoredChatRef.current) {
      return;
    }
  
    hasRestoredChatRef.current = true;
  
    const savedChatId = localStorage.getItem(
      `ai-studio-active-chat-${user.id}`,
    );
  
    if (!savedChatId) {
      return;
    }
  
    const chatExists = chats.some(
      (chat) => chat.id === savedChatId,
    );
  
    if (chatExists) {
      void handleSelectChat(savedChatId);
    } else {
      localStorage.removeItem(
        `ai-studio-active-chat-${user.id}`,
      );
    }
  }, [user, isLoadingChats, chats, handleSelectChat]);

  
  const handleSendMessage = async (
    question: string,
    files: File[],
  ) => {  
    const messageQuestion = question.trim();

    const generationQuestion =
      messageQuestion ||
      (files.length > 0
        ? 'Analyze the attached file and briefly describe its requirements.'
        : '');
    
    if (!generationQuestion) return;
  const initialChatId = activeChatIdRef.current;
  const operationKey = initialChatId ?? `pending-${Date.now()}`;

  if (operationsRef.current.has(operationKey)) return;

  const viewId = viewRequestIdRef.current;
  let chatId = initialChatId;
  let messageId = '';
  operationsRef.current.add(operationKey);

  if (chatId) {
    setGeneratingChatIds((current) => new Set(current).add(chatId!));
  } else {
    setIsCreatingChat(true);
  }

  const temporaryMessage: Message = {
    id: `temporary-${Date.now()}`,
    chatId: chatId ?? '',
    role: 'user',
    content: messageQuestion,
    sources: null,
    createdAt: new Date().toISOString(),
    localFiles: files,
  };

  setMessages((current) => [...current, temporaryMessage]);

  try {
    if (!chatId) {
      const chat = await prepareNewChat({
        question: messageQuestion,
        titlePrompt: files.map((file) => file.name).join(', '),
      });
      chatId = chat.id;
      messageId = chat.messageId;

      localStorage.setItem(
        `ai-studio-active-chat-${user.id}`,
        chat.id,
      );

      if (stopNewChatRequestedRef.current) {
        stopNewChatRequestedRef.current = false;
        setIsCreatingChatStopping(false);
      
        setStoppingChatIds((current) => new Set(current).add(chat.id));
        pendingStopChatIdsRef.current.add(chat.id);
      }
      showNotification('success', t.chatCreated);
      operationsRef.current.delete(operationKey);
      operationsRef.current.add(chatId);
      setGeneratingChatIds((current) =>
        new Set(current).add(chatId!),
      );

      setChats((current) => [
        chat,
        ...current.filter((item) => item.id !== chat.id),
      ]);

      if (
        viewRequestIdRef.current === viewId &&
        activeChatIdRef.current === null
      ) {
        activeChatIdRef.current = chatId;
        setActiveChatId(chatId);

        setMessages((current) =>
          current.map((message) =>
            message.id === temporaryMessage.id
              ? { ...message, chatId }
              : message,
          ),
        );
      }

      if (viewRequestIdRef.current === viewId) {
        setIsCreatingChat(false);
      }
    } else {
      const message = await createUserMessage(
          chatId,
          { question: messageQuestion },
      );
  
      messageId = message.id;
      console.log('[CHAT] Message created:', messageId);
    }

    if (
      viewRequestIdRef.current === viewId &&
      activeChatIdRef.current === chatId
  ) {
      setMessages((current) =>
          current.map((message) =>
              message.id === temporaryMessage.id
                  ? {
                      ...message,
                      id: messageId,
                      chatId: chatId!,
                  }
                  : message,
          ),
      );
  }

  console.log('[CHAT] Files to upload:', files);
  if (files.length > 0) {
    console.log('[CHAT] Upload started');
    await uploadChatFiles(chatId!, files, messageId);
    console.log('[CHAT] Upload completed');
    const uploadedFiles = await getChatFiles(chatId!);

    console.log('[FILES] API response:', uploadedFiles);
    console.log('[FILES] Active chat:', activeChatIdRef.current);
    console.log('[FILES] Upload chat:', chatId);
    
    if (activeChatIdRef.current === chatId) {
      console.log('[FILES] Updating state');
    
      setChatFiles(uploadedFiles);
 
      setMessages((current) =>
        current.map((message) => {
          if (message.id !== messageId) return message;
  
          const { localFiles, ...savedMessage } = message;
          return savedMessage;
        }),
      );
    } else {
      console.log('[FILES] State update skipped: chat IDs do not match');
    }
  }

    const response = await startGeneration(chatId!, {
      question: generationQuestion,
      userMessageAlreadySaved: true,
    });

    generationTasksRef.current.set(chatId!, response.taskId);

    void waitForGeneration(response.taskId, chatId!);
    
    if (pendingStopChatIdsRef.current.has(chatId!)) {
      pendingStopChatIdsRef.current.delete(chatId!);
    
      void cancelGeneration(response.taskId).catch((error) => {
        console.error('Failed to stop generation:', error);
    
        setStoppingChatIds((current) => {
          const next = new Set(current);
          next.delete(chatId!);
          return next;
        });
    
        showNotification('error', t.sendMessageError);
      });
    }

  } catch (error) {
    console.error('Failed to start generation:', error);

    if (chatId) {
      try {
        const updatedMessages = await getChatMessages(chatId);

        if (activeChatIdRef.current === chatId) {
          setMessages(updatedMessages);
        }
      } catch (loadError) {
        console.error('Failed to reload messages:', loadError);
      }

      operationsRef.current.delete(chatId);
      generationTasksRef.current.delete(chatId);

      setGeneratingChatIds((current) => {
        const next = new Set(current);
        next.delete(chatId!);
        return next;
      });
    } else {
      setMessages((current) =>
        current.filter(
          (message) => message.id !== temporaryMessage.id,
        ),
      );
    }

    showNotification('error', t.sendMessageError);
  } finally {
    operationsRef.current.delete(operationKey);

    if (viewRequestIdRef.current === viewId) {
      setIsCreatingChat(false);
    }
  }
};

  const handleStopGeneration = async () => {
    const chatId = activeChatIdRef.current;

    if (!chatId) {
      if (isCreatingChat) {
        stopNewChatRequestedRef.current = true;
        setIsCreatingChatStopping(true);
      }

      return;
    }

    setStoppingChatIds((current) => new Set(current).add(chatId));

    const taskId = generationTasksRef.current.get(chatId);

    if (!taskId) {
      const activeController = controllersRef.current.get(chatId);

      if (activeController) {
        activeController.abort();
        return;
      }

      pendingStopChatIdsRef.current.add(chatId);
      return;
    }

    try {
      await cancelGeneration(taskId);
    } catch (error) {
      console.error('Failed to stop generation:', error);

      pendingStopChatIdsRef.current.delete(chatId);

      setStoppingChatIds((current) => {
        const next = new Set(current);
        next.delete(chatId);
        return next;
      });

      showNotification('error', t.sendMessageError);
    }
  };
 
  const handleEditMessage = async (messageId: string, question: string) => {
    const chatId = activeChatIdRef.current;

    if (!chatId || operationsRef.current.has(chatId)) return;

    const messageIndex = messages.findIndex(
      (message) => message.id === messageId,
    );

    if (messageIndex === -1) return;

    const previousMessages = messages;

    const updatedMessages = [
      ...messages.slice(0, messageIndex),
      {
        ...messages[messageIndex],
        content: question,
      },
    ];

    setMessages(updatedMessages);

    const controller = new AbortController();

    operationsRef.current.add(chatId);
    controllersRef.current.set(chatId, controller);

    setGeneratingChatIds((current) => new Set(current).add(chatId));

    try {
      const response = await editMessage(
        chatId,
        messageId,
        { question },
        controller.signal,
      );

      if (!response.success) {
        throw new Error(response.message || 'Message editing failed');
      }

      const finalMessages = await getChatMessages(chatId);

      if (activeChatIdRef.current === chatId) {
        setMessages(finalMessages);
      }

      await loadChats();
    } catch (error) {
      const isCancelled =
        controller.signal.aborted ||
        (error instanceof Error && error.name === 'CanceledError');

      console.error('Failed to edit message:', error);

      try {
        const restoredMessages = await getChatMessages(chatId);

        if (activeChatIdRef.current === chatId) {
          setMessages(restoredMessages);
        }
      } catch (loadError) {
        console.error('Failed to restore messages:', loadError);

        if (activeChatIdRef.current === chatId) {
          setMessages(previousMessages);
        }
      }

      if (!isCancelled) {
        showNotification('error', t.sendMessageError);
      }
    } finally {
      operationsRef.current.delete(chatId);
      controllersRef.current.delete(chatId);

      setStoppingChatIds((current) => {
        const next = new Set(current);
        next.delete(chatId);
        return next;
      });

      setGeneratingChatIds((current) => {
        const next = new Set(current);
        next.delete(chatId);
        return next;
      });
    }
  };
  
  const handleRegenerateMessage = async (messageId: string) => {
    const chatId = activeChatIdRef.current;

    if (!chatId || operationsRef.current.has(chatId)) return;

    operationsRef.current.add(chatId);

    setRegeneratingMessageId(messageId);
    
    setMessages((current) => {
      const messageIndex = current.findIndex(
          (message) => message.id === messageId,
      );
  
      if (messageIndex === -1) {
          return current;
      }
  
      return current.slice(0, messageIndex + 1);
  });

    setGeneratingChatIds((current) =>
        new Set(current).add(chatId),
    );

    try {
        const response = await regenerateMessage(
            chatId,
            messageId,
        );

        const updatedMessages = await getChatMessages(chatId);

        if (activeChatIdRef.current === chatId) {
            setMessages(updatedMessages);
        }

        generationTasksRef.current.set(
            chatId,
            response.taskId,
        );

        void waitForGeneration(
            response.taskId,
            chatId,
        );
    } catch (error) {
        console.error('Failed to regenerate message:', error);
        setRegeneratingMessageId(null);
        try {
            const updatedMessages = await getChatMessages(chatId);

            if (activeChatIdRef.current === chatId) {
                setMessages(updatedMessages);
            }
        } catch (loadError) {
            console.error('Failed to reload messages:', loadError);
        }

        operationsRef.current.delete(chatId);
        generationTasksRef.current.delete(chatId);

        setGeneratingChatIds((current) => {
            const next = new Set(current);
            next.delete(chatId);
            return next;
        });

        showNotification('error', t.sendMessageError);
    }
  };

  const handleRenameChat = (chat: Chat) => {
    setNewChatTitle(chat.title);
    setDialog({ type: 'rename', chat });
  };

  const handleDeleteChat = (chatId: string) => {
    setDialog({ type: 'delete', chatId });
  };

  const handleDeleteMessage = (messageId: string) => {
    const chatId = activeChatIdRef.current;
    if (!chatId) return;

    const messageIndex = messages.findIndex(
      (message) => message.id === messageId,
    );

    if (messageIndex === -1) return;

    // The backend deletes the selected message and every message after it.
    // Deleting the first message would therefore remove the whole conversation.
    if (messageIndex === 0) {
      setDialog({
        type: 'delete',
        chatId,
      });
      return;
    }

    setDialog({
      type: 'delete-message',
      messageId,
    });
  };

  const closeDialog = () => {
    setDialog(null);
    setNewChatTitle('');
  };

  const handleDialogConfirm = async () => {
    if (!dialog || deletingMessageRef.current) return;

    const currentDialog = dialog;
    deletingMessageRef.current = true;

    if (currentDialog.type === 'rename') {
      const title = newChatTitle.trim();

      if (!title || title === currentDialog.chat.title) {
        deletingMessageRef.current = false;
        closeDialog();
        return;
      }

      try {
        await updateChatTitle(currentDialog.chat.id, { title });

        setChats((current) =>
          current.map((chat) =>
            chat.id === currentDialog.chat.id
              ? { ...chat, title }
              : chat,
          ),
        );

        showNotification('success', t.chatRenamed);
        closeDialog();
      } catch (error) {
        console.error('Failed to rename chat:', error);
        showNotification('error', t.renameChatError);
      } finally {
        deletingMessageRef.current = false;
      }

      return;
    }

    if (currentDialog.type === 'delete-message') {
      const chatId = activeChatIdRef.current;

      if (!chatId) {
        deletingMessageRef.current = false;
        closeDialog();
        return;
      }

      try {
        setIsDeletingMessage(true);

        await deleteMessage(chatId, currentDialog.messageId);

        const updatedMessages = await getChatMessages(chatId);

        if (activeChatIdRef.current === chatId) {
          setMessages(updatedMessages);
          await loadChatFiles(chatId);
        }

        await loadChats();

        showNotification('success', t.messageDeleted);
        closeDialog();
      } catch (error) {
        console.error('Failed to delete message:', error);
        showNotification('error', t.deleteMessageError);
      } finally {
        setIsDeletingMessage(false);
        deletingMessageRef.current = false;
      }

      return;
    }

    // Both regular chat deletion and deletion initiated from the first
    // message arrive here as a "delete" dialog.
    const chatIdToDelete = currentDialog.chatId;

    if (!chatIdToDelete) {
      deletingMessageRef.current = false;
      closeDialog();
      return;
    }

    try {
      await deleteChat(chatIdToDelete);

      setChats((current) =>
        current.filter((chat) => chat.id !== chatIdToDelete),
      );

      controllersRef.current.get(chatIdToDelete)?.abort();
      controllersRef.current.delete(chatIdToDelete);
      operationsRef.current.delete(chatIdToDelete);

      setGeneratingChatIds((current) => {
        const next = new Set(current);
        next.delete(chatIdToDelete);
        return next;
      });

      if (activeChatIdRef.current === chatIdToDelete) {
        viewRequestIdRef.current++;
        messagesRequestIdRef.current++;
        activeChatIdRef.current = null;
        setActiveChatId(null);
        setMessages([]);
        filesRequestIdRef.current++;
        setChatFiles([]);
        setIsLoadingMessages(false);
      }

      showNotification('success', t.chatDeleted);
      closeDialog();
    } catch (error) {
      console.error('Failed to delete chat:', error);
      showNotification('error', t.deleteChatError);
    } finally {
      deletingMessageRef.current = false;
      setIsDeletingMessage(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/signin', { replace: true });
    }
  };

  if (isLoading || !user) {
    return (
      <div className="home-loading">
        {t.homeLoading}
      </div>
    );
  }

  return (
    <div className="home-page">
      {isSidebarOpen && (
        <>
          <button
            className="chat-sidebar-overlay"
            onClick={() => setIsSidebarOpen(false)}
            aria-label={t.closeSidebar}
          />
          <ChatSidebar
            user={user}
            chats={chats}
            activeChatId={activeChatId}
            isCreatingChat={isCreatingChat}
            isLoadingChats={isLoadingChats}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            onRenameChat={handleRenameChat}
            onDeleteChat={handleDeleteChat}
            onLogout={handleLogout}
            onToggle={() => setIsSidebarOpen((prev) => !prev)}
          />
        </>
      )}

      <div className="chat-workspace">
        {!isSidebarOpen && (
          <button
            className="open-sidebar-button"
            onClick={() => setIsSidebarOpen(true)}
            title={t.openSidebar}
            aria-label={t.openSidebar}
          >
            <PanelLeftOpen size={20} />
          </button>
        )}
          {isLoadingChats && chats.length === 0 ? (
            <div className="home-loading">
              {t.loadingChats}
            </div>
          ) : (
            <ChatWindow
              user={user}
              messages={messages}
              chatFiles={chatFiles}
              activeChatId={activeChatId}
              isSending={activeChatId ? generatingChatIds.has(activeChatId) : isCreatingChat}
              isLoadingMessages={isLoadingMessages}
              isDeletingMessage={isDeletingMessage}
              regeneratingMessageId={regeneratingMessageId}
              onSend={handleSendMessage}
              onStop={handleStopGeneration}
              onEdit={handleEditMessage}
              onRegenerate={handleRegenerateMessage}
              onDeleteMessage={handleDeleteMessage}
              isStopping={
                activeChatId
                  ? stoppingChatIds.has(activeChatId)
                  : isCreatingChatStopping
              }
            />
          )}
      </div>

      {dialog && (
        <div
          className="chat-dialog-overlay"
          onClick={closeDialog}
        >
          <div
            className="chat-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="chat-dialog-header">
              <h2 id="chat-dialog-title">
              {dialog.type === 'rename'
                ? t.renameDialogTitle
                : dialog.type === 'delete-message'
                  ? t.deleteMessageDialogTitle
                  : t.deleteDialogTitle}
              </h2>

              <button
                className="chat-dialog-close"
                onClick={closeDialog}
                aria-label={t.close}
              >
                <X size={19} />
              </button>
            </div>

            {dialog.type === 'rename' ? (
              <div className="chat-dialog-content">
                <label htmlFor="chat-title-input">
                  {t.chatTitleLabel}
                </label>

                <input
                  id="chat-title-input"
                  type="text"
                  value={newChatTitle}
                  onChange={(event) =>
                    setNewChatTitle(event.target.value)
                  }
                  maxLength={100}
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleDialogConfirm();
                    }
                  }}
                />
              </div>
            ) : (
              <p className="chat-dialog-description">
                {dialog.type === 'delete-message'
                  ? t.deleteMessageDialogDescription
                  : t.deleteDialogDescription}
              </p>
            )}

            <div className="chat-dialog-actions">
            <button
              className="chat-dialog-cancel"
              onClick={closeDialog}
              disabled={isDeletingMessage}
            >
              {t.cancel}
            </button>

            <button
              className={`chat-dialog-confirm ${
                dialog.type === 'delete' ? 'danger' : ''
              }`}
              onClick={handleDialogConfirm}
              disabled={
                isDeletingMessage ||
                (dialog.type === 'rename' && !newChatTitle.trim())
              }
            >
                {dialog.type === 'rename'
                  ? t.saveChanges
                  : t.deleteChat}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
