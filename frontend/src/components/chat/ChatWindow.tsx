import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode, ChangeEvent } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Sparkles,
  User as UserIcon,
  Square,
  Pencil,
  Check,
  X,
  Download,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  FileImage,
  File,
  Copy,
  RefreshCw,
  Trash2,
  Paperclip,
} from 'lucide-react';

import type { ChatWindowProps } from '../../types/chat.types';
import { useLanguage } from '../../context/LanguageContext';
import { TRANSLATIONS } from '../../constants/translations';
import type { GeneratedFileInfo } from '../../types/generated-file.types';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import ChatSkeleton from './skeleton/ChatSkeleton';
import { useNotification } from '../../context/NotificationContext';


function getGeneratedFile(content: string): GeneratedFileInfo | null {
  const linkMatch = content.match(
    /\[Download file\]\((https?:\/\/[^)\s]+)\)/i,
  );

  if (!linkMatch || linkMatch.index === undefined) {
    return null;
  }

  const fileName = content
    .slice(0, linkMatch.index)
    .trim()
    .split('\n')
    .filter(Boolean)
    .pop()
    ?.trim()
    .replace(/\.$/, '');

  if (!fileName || !/\.[a-z0-9]{2,10}$/i.test(fileName)) {
    return null;
  }

  const description = content
    .slice(0, linkMatch.index)
    .trim()
    .replace(fileName, '')
    .trim();

  return {
    fileName,
    downloadUrl: linkMatch[1],
    description,
  };
}

function getFileIcon(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'xlsx':
    case 'xls':
    case 'csv':
      return FileSpreadsheet;

    case 'zip':
    case 'rar':
    case '7z':
      return FileArchive;

    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
      return FileImage;

    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
    case 'json':
    case 'html':
    case 'css':
    case 'py':
      return FileCode;

    case 'pdf':
    case 'doc':
    case 'docx':
    case 'ppt':
    case 'pptx':
    case 'txt':
    case 'md':
      return FileText;

    default:
      return File;
  }
}

function GeneratedFileCard({
  file,
}: {
  file: GeneratedFileInfo;
}) {
  const FileIcon = getFileIcon(file.fileName);
  const extension = file.fileName.split('.').pop()?.toUpperCase();

  return (
    <div className="generated-file-card">
      <div className="generated-file-icon">
        <FileIcon size={25} />
      </div>

      <div className="generated-file-info">
        <span className="generated-file-name">{file.fileName}</span>
        <span className="generated-file-format">
          {extension} · Generated file
        </span>
      </div>

      <a
        className="generated-file-download"
        href={file.downloadUrl}
        target="_blank"
        rel="noreferrer"
        title="Download file"
        aria-label={`Download ${file.fileName}`}
      >
        <Download size={19} />
      </a>
    </div>
  );
}

function MarkdownCode({
  className,
  children,
  showNotification,
}: {
  className?: string;
  children: ReactNode;
  showNotification: (
    type: 'success' | 'error' | 'info',
    message: string,
  ) => void;
}) {
  const [copied, setCopied] = useState(false);
  const { language } = useLanguage();
  const t = TRANSLATIONS[language];
  const code = String(children).replace(/\n$/, '');
  const isBlock = Boolean(className) || code.includes('\n');

  if (!isBlock) {
    return <code className="inline-code">{children}</code>;
  }

  const codeLanguage =
    className
      ?.split(/\s+/)
      .find((name) => name.startsWith('language-'))
      ?.replace('language-', '') || 'code';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showNotification('success', t.codeCopied);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy code:', error);
      showNotification('error', t.copyCodeError);
    }
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{codeLanguage}</span>
        <button type="button" onClick={handleCopy}>
          <Copy size={14} />
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>

      <pre>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

function ChatWindow({
  user,
  messages,
  isSending,
  isStopping,
  isLoadingMessages,
  isDeletingMessage,
  regeneratingMessageId,
  chatFiles,
  onSend,
  onStop,
  onEdit,
  onRegenerate,
  onDeleteMessage,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const previousMessagesLengthRef = useRef(messages.length);
  const isProgrammaticScrollRef = useRef(false);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const { language } = useLanguage();
  const t = TRANSLATIONS[language];
  const { showNotification } = useNotification();

  const originalEditingText =
    messages.find((message) => message.id === editingMessageId)?.content ?? '';
  const hasEditChanges = editingText.trim() !== originalEditingText.trim();

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      showNotification('success', t.messageCopied);

      setTimeout(() => {
        setCopiedMessageId((current) =>
          current === messageId ? null : current,
        );
      }, 1500);
    } catch (error) {
      console.error('Failed to copy message:', error);
      showNotification('error', t.copyMessageError);
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const allowedExtensions = [
      '.pdf',
      '.docx',
      '.csv',
      '.txt',
      '.md',
      '.json',
      '.log',
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
    ];

    const maxFileSize = 20 * 1024 * 1024;
    const availableFiles: File[] = [];

    for (const file of files) {
      const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;

      if (!allowedExtensions.includes(extension)) {
        showNotification('error', `Unsupported file: ${file.name}`);
        continue;
      }

      if (file.size > maxFileSize) {
        showNotification('error', `File is too large: ${file.name}`);
        continue;
      }

      availableFiles.push(file);
    }

    setSelectedFiles((current) => {
      const remainingSlots = 10 - current.length;
      const newFiles = availableFiles.slice(0, remainingSlots);

      if (availableFiles.length > remainingSlots) {
        showNotification('error', 'Maximum 10 files allowed');
      }

      return [...current, ...newFiles];
    });

    event.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((current) =>
      current.filter((_, fileIndex) => fileIndex !== index),
    );
  };

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    if (messages.length > previousMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }

    previousMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    if (isProgrammaticScrollRef.current) {
      setShowScrollToBottom(false);

      if (distanceFromBottom <= 5) {
        isProgrammaticScrollRef.current = false;
      }

      return;
    }

    setShowScrollToBottom(distanceFromBottom > 120);
  };

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    isProgrammaticScrollRef.current = true;
    setShowScrollToBottom(false);

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  };

  const cancelProgrammaticScroll = () => {
    if (!isProgrammaticScrollRef.current) return;

    isProgrammaticScrollRef.current = false;
    handleMessagesScroll();
  };

  const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 180);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 180 ? 'auto' : 'hidden';
  };

  useEffect(() => {
    resizeTextarea(textareaRef.current);
  }, [input]);

  useEffect(() => {
    resizeTextarea(editTextareaRef.current);
  }, [editingText, editingMessageId]);

  const handleSubmit = () => {
    const value = input.trim();

    if ((!value && selectedFiles.length === 0) || isSending) return;

    onSend(value, selectedFiles);
    setInput('');
    setSelectedFiles([]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleStartEdit = (messageId: string, content: string) => {
    if (isSending || messageId.startsWith('temporary-')) return;

    setEditingMessageId(messageId);
    setEditingText(content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleSaveEdit = () => {
    if (
      !editingMessageId ||
      !editingText.trim() ||
      !hasEditChanges ||
      isSending
    ) {
      return;
    }

    onEdit(editingMessageId, editingText.trim());
    handleCancelEdit();
  };

  return (
    <main className="chat-main">
      <div className="chat-topbar">
        <span>AI Studio</span>

        <span className="chat-model-label">
          <Sparkles size={15} />
          AI Assistant
        </span>
      </div>

      <div
        className="chat-messages"
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        onWheel={cancelProgrammaticScroll}
        onTouchStart={cancelProgrammaticScroll}
        onPointerDown={cancelProgrammaticScroll}
      >
        {isLoadingMessages ? (
          <ChatSkeleton />
        ) : messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">
              <Sparkles size={30} />
            </div>
            <h1>{t.chatWelcomeTitle}</h1>
            <p>{t.chatWelcomeDescription}</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => {
              const generatedFile =
                message.role === 'assistant'
                  ? getGeneratedFile(message.content)
                  : null;
              return (
                <div
                  key={message.id}
                  className={`message-row ${message.role}`}
                >
                  <div className="message-avatar">
                    {message.role === 'user' ? (
                      user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="message-user-avatar"
                        />
                      ) : (
                        <span className="message-user-initials">
                          {initials || <UserIcon size={18} />}
                        </span>
                      )
                    ) : (
                      <Sparkles size={18} />
                    )}
                  </div>

                  <div className="message-content">
                    <span className="message-author">
                      {message.role === 'user' ? t.you : 'AI Assistant'}
                    </span>

                    {editingMessageId === message.id ? (
                      <div className="message-edit-container">
                        <textarea
                          ref={editTextareaRef}
                          className="message-edit-textarea"
                          value={editingText}
                          onChange={(event) =>
                            setEditingText(event.target.value)
                          }
                          autoFocus
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              handleCancelEdit();
                            }

                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              handleSaveEdit();
                            }
                          }}
                        />

                        <div className="message-edit-actions">
                          <button type="button" onClick={handleCancelEdit}>
                            <X size={16} />
                            {t.cancel}
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={
                              !editingText.trim() || !hasEditChanges || isSending
                            }
                          >
                            <Check size={16} />
                            {t.saveChanges}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {regeneratingMessageId === message.id && !isStopping ? (
                          <div className="chat-thinking">
                            <span />
                            <span />
                            <span />
                          </div>
                        ) : generatedFile ? (
                          <div className="message-text">
                            {generatedFile.description && (
                              <p>{generatedFile.description}</p>
                            )}
                            <GeneratedFileCard file={generatedFile} />
                          </div>
                        ) : message.role === 'assistant' ? (
                          <div className="message-text assistant-markdown">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                              components={{
                                pre: ({ children }) => <>{children}</>,
                                code: ({ className, children }) => (
                                  <MarkdownCode
                                    className={className}
                                    showNotification={showNotification}
                                  >
                                    {children}
                                  </MarkdownCode>
                                ),
                                img: ({ src, alt }) => {
                                  if (typeof src !== 'string' || !src) return null;

                                  const imageAlt = alt || 'Generated image';

                                  return (
                                    <span className="generated-image-card">
                                      <button
                                        type="button"
                                        className="generated-image-preview"
                                        onClick={() => setPreviewImage({ src, alt: imageAlt })}
                                        aria-label="Open generated image"
                                      >
                                        <img src={src} alt={imageAlt} loading="lazy" />
                                      </button>
                                      <a
                                        className="generated-image-download"
                                        href={src}
                                        target="_blank"
                                        rel="noreferrer"
                                        download
                                      >
                                        <Download size={15} />
                                        Download image
                                      </a>
                                    </span>
                                  );
                                },
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          message.content && (
                            <div className="message-text">
                              {message.content}
                            </div>
                          )
                        )}

                        {(!message.id.startsWith('temporary-') || isStopping) && (
                          <div className="message-actions">
                            {!generatedFile && message.role === 'user' && (
                              <button
                                type="button"
                                className="message-copy-button"
                                onClick={() =>
                                  handleCopyMessage(message.id, message.content)
                                }
                                title={
                                  copiedMessageId === message.id ? 'Copied' : 'Copy'
                                }
                                aria-label={
                                  copiedMessageId === message.id ? 'Copied' : 'Copy'
                                }
                              >
                                {copiedMessageId === message.id ? (
                                  <Check size={15} />
                                ) : (
                                  <Copy size={15} />
                                )}
                              </button>
                            )}

                            {message.role === 'user' && (
                              <button
                                type="button"
                                className="message-edit-button"
                                onClick={() =>
                                  handleStartEdit(message.id, message.content)
                                }
                                title={t.editMessage}
                                aria-label={t.editMessage}
                                disabled={isSending}
                              >
                                <Pencil size={15} />
                              </button>
                            )}

                            {message.role === 'user' && (
                              <button
                                type="button"
                                className="message-delete-button"
                                onClick={() => onDeleteMessage(message.id)}
                                title={t.deleteMessage}
                                aria-label={t.deleteMessage}
                                disabled={isSending || isDeletingMessage}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}

                            {message.role === 'assistant' && (
                              <button
                                type="button"
                                className="message-regenerate-button"
                                onClick={() => onRegenerate(message.id)}
                                title="Regenerate response"
                                aria-label="Regenerate response"
                                disabled={isSending}
                              >
                                <RefreshCw size={15} />
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {message.role === 'user' && (() => {
                      const messageFiles = chatFiles.filter(
                        (file) => file.messageId === message.id,
                      );

                      const localFiles = message.localFiles || [];

                      if (messageFiles.length === 0 && localFiles.length === 0) {
                        return null;
                      }

                      return (
                        <div className="chat-attachments">
                          <div className="chat-attachments-list">
                            {messageFiles.map((file) => {
                              const FileIcon = getFileIcon(file.originalName);
                              const extension = file.originalName
                                .split('.')
                                .pop()
                                ?.toUpperCase();

                              return (
                                <div className="chat-attachment" key={file.id}>
                                  <div className="chat-attachment-icon">
                                    <FileIcon size={20} />
                                  </div>
                                  <div className="chat-attachment-info">
                                    <span className="chat-attachment-name">
                                      {file.originalName}
                                    </span>
                                    <small>
                                      {extension} · {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </small>
                                  </div>
                                </div>
                              );
                            })}

                            {localFiles.map((file, index) => {
                              const FileIcon = getFileIcon(file.name);
                              return (
                                <div className="chat-attachment" key={`${file.name}-${index}`}>
                                  <div className="chat-attachment-icon">
                                    <FileIcon size={20} />
                                  </div>
                                  <div className="chat-attachment-info">
                                    <span className="chat-attachment-name">{file.name}</span>
                                    <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {message.sources && message.sources.length > 0 && (
                      <div className="message-sources">
                        <strong>{t.sources}:</strong>
                        {message.sources.map((source, index) => (
                          <a
                            key={`${source}-${index}`}
                            href={source}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {source}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && !isStopping && !regeneratingMessageId && (
              <div className="message-row assistant">
                <div className="message-avatar">
                  <Sparkles size={18} />
                </div>

                <div className="message-content">
                  <span className="message-author">AI Assistant</span>
                  <div className="chat-thinking">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {showScrollToBottom && (
        <button
          type="button"
          className="scroll-to-bottom-button"
          onClick={scrollToBottom}
          title="Scroll to bottom"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={19} />
        </button>
      )}

      <div className="chat-input-container">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.csv,.txt,.md,.json,.log,.jpg,.jpeg,.png,.webp"
          onChange={handleFileSelect}
          hidden
        />

        {selectedFiles.length > 0 && (
          <div className="selected-files">
            {selectedFiles.map((file, index) => {
              const FileIcon = getFileIcon(file.name);

              return (
                <div className="selected-file" key={`${file.name}-${index}`}>
                  <FileIcon size={20} />

                  <div className="selected-file-info">
                    <span>{file.name}</span>
                    <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="chat-input-box">
          <button
            type="button"
            className="chat-attach-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || selectedFiles.length >= 10}
            title="Attach files"
            aria-label="Attach files"
          >
            <Paperclip size={20} />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chatInputPlaceholder}
            rows={1}
            disabled={isSending}
          />

          <button
            type="button"
            className="chat-send-button"
            onClick={isSending ? onStop : handleSubmit}
            disabled={
              isStopping ||
              (!isSending && !input.trim() && selectedFiles.length === 0)
            }
            title={isSending ? t.stopGeneration : t.sendMessage}
            aria-label={isSending ? t.stopGeneration : t.sendMessage}
          >
            {isSending ? (
              <Square size={17} fill="currentColor" />
            ) : (
              <ArrowUp size={21} />
            )}
          </button>
        </div>

        <span className="chat-input-hint">{t.chatInputHint}</span>
      </div>

      {previewImage && (
        <div
          className="generated-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Generated image preview"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            className="generated-image-lightbox-close"
            onClick={() => setPreviewImage(null)}
            aria-label="Close image preview"
          >
            <X size={22} />
          </button>
          <img
            src={previewImage.src}
            alt={previewImage.alt}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}

export default ChatWindow;
