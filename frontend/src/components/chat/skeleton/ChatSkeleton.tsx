
function ChatSkeleton() {
  return (
    <div className="chat-skeleton-list">

      <div className="chat-skeleton-row user">
        <div className="chat-skeleton-bubble user">
          <div className="chat-skeleton-line long" />
          <div className="chat-skeleton-line medium" />
        </div>
        <div className="chat-skeleton-user-avatar" />
      </div>

      <div className="chat-skeleton-row assistant">
        <div className="chat-skeleton-avatar">✦</div>
        <div className="chat-skeleton-content">
          <div className="chat-skeleton-author" />
          <div className="chat-skeleton-line long" />
          <div className="chat-skeleton-line long" />
          <div className="chat-skeleton-line medium" />
          <div className="chat-skeleton-line long" />
          <div className="chat-skeleton-line short" />
        </div>
      </div>

      <div className="chat-skeleton-row user">
        <div className="chat-skeleton-bubble user">
          <div className="chat-skeleton-line medium" />
          <div className="chat-skeleton-line short" />
        </div>
        <div className="chat-skeleton-user-avatar" />
      </div>

      <div className="chat-skeleton-row assistant">
        <div className="chat-skeleton-avatar">✦</div>
        <div className="chat-skeleton-content">
          <div className="chat-skeleton-author" />
          <div className="chat-skeleton-line medium" />
          <div className="chat-skeleton-line long" />
          <div className="chat-skeleton-line long" />
          <div className="chat-skeleton-line short" />
        </div>
      </div>

    </div>
  );
}

export default ChatSkeleton;
