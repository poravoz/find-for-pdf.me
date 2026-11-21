
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MessageSquare,
  Settings,
  LogOut,
  MoreHorizontal,
  Pencil,
  Trash2,
  PanelLeftClose,
} from 'lucide-react';

import type { ChatSidebarProps } from '../../types/chat.types';

import { useLanguage } from '../../context/LanguageContext';
import { TRANSLATIONS } from '../../constants/translations';
import SidebarSkeleton from './skeleton/SidebarSkeleton';

function ChatSidebar({
  user,
  chats,
  activeChatId,
  isCreatingChat,
  isLoadingChats,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onLogout,
  onToggle,
}: ChatSidebarProps) {
  const [search, setSearch] = useState('');
  const [menuChatId, setMenuChatId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = TRANSLATIONS[language];

  const filteredChats = useMemo(() => {
    return chats.filter((chat) =>
      chat.title.toLowerCase().includes(search.toLowerCase()),
    );
  }, [chats, search]);

  return (
    <aside className="chat-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <MessageSquare size={21} />
          </div>
          <span>AI Studio</span>
        </div>

        <button
          className="sidebar-icon-button"
          onClick={onToggle}
          title={t.closeSidebar}
          aria-label={t.closeSidebar}
        >
          <PanelLeftClose size={19} />
        </button>
      </div>

      <div className="sidebar-actions">
        <button className="new-chat-button" onClick={onNewChat}>
          <Plus size={19} />
          <span>{t.newChat}</span>
        </button>

        <div className="chat-search">
          <Search size={17} />
          <input
            type="text"
            placeholder={t.searchChats}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="chat-history">
  <span className="sidebar-section-title">{t.chatHistory}</span>

          {isLoadingChats && chats.length === 0 ? (
            <SidebarSkeleton />
          ) : filteredChats.length === 0 && !isCreatingChat ? (
            <div className="empty-chat-history">
              {search ? t.noChatsFound : t.noChatsYet}
            </div>
          ) : (
            <>
            {isCreatingChat && (
              <div className="chat-history-item active creating-chat">
                <div className="chat-history-select">
                  <MessageSquare size={17} />

                  <span>{t.newChat}</span>

                  <div className="creating-chat-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            
            {filteredChats.map((chat) => {
              const isTitleGenerating = chat.title === 'New chat';

              return (
                <div
                  key={chat.id}
                  className={`chat-history-item ${
                    activeChatId === chat.id ? 'active' : ''
                  } ${isTitleGenerating ? 'creating-chat' : ''}`}
                >
                  <button
                    className="chat-history-select"
                    onClick={() => onSelectChat(chat.id)}
                    title={chat.title}
                  >
                    <MessageSquare size={17} />

                    <span>{chat.title}</span>

                    {isTitleGenerating && (
                      <div className="creating-chat-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                  </button>

                  <button
                    className="chat-menu-button"
                    onClick={() =>
                      setMenuChatId(
                        menuChatId === chat.id ? null : chat.id,
                      )
                    }
                    aria-label={t.chatActions}
                    aria-expanded={menuChatId === chat.id}
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {menuChatId === chat.id && (
                    <div className="chat-context-menu">
                      <button
                        onClick={() => {
                          onRenameChat(chat);
                          setMenuChatId(null);
                        }}
                      >
                        <Pencil size={15} />
                        {t.renameChat}
                      </button>

                      <button
                        className="delete-chat-action"
                        onClick={() => {
                          onDeleteChat(chat.id);
                          setMenuChatId(null);
                        }}
                      >
                        <Trash2 size={15} />
                        {t.deleteChat}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

          </>
        )}
      </div>
      
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="sidebar-user-info">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
        </div>

        <button
          className="sidebar-footer-button"
          onClick={() => navigate('/settings')}
        >
          <Settings size={18} />
          {t.settings}
        </button>

        <button
          className="sidebar-footer-button logout-button"
          onClick={onLogout}
        >
          <LogOut size={18} />
          {t.logout}
        </button>
      </div>
    </aside>
  );
}

export default ChatSidebar;
