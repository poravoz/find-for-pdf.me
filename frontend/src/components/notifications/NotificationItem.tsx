
import {
    CheckCircle,
    AlertCircle,
    Info,
    X,
  } from 'lucide-react';
  
  import type { NotificationItemProps } from '../../types/notification.types';
  
  function NotificationItem({
    notification,
    onClose,
  }: NotificationItemProps) {
    const icons = {
      success: <CheckCircle size={20} />,
      error: <AlertCircle size={20} />,
      info: <Info size={20} />,
    };
  
    return (
      <div
        className={`notification notification-${notification.type}`}
        role="alert"
      >
        <div className="notification-icon">
          {icons[notification.type]}
        </div>
  
        <span className="notification-message">
          {notification.message}
        </span>
  
        <button
          className="notification-close"
          onClick={() => onClose(notification.id)}
          aria-label="Close notification"
        >
          <X size={17} />
        </button>
      </div>
    );
  }
  
  export default NotificationItem;
  