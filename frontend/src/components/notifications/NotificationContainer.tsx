
import { useNotification } from '../../context/NotificationContext';

import NotificationItem from './NotificationItem';
import './Notification.css';

function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
}

export default NotificationContainer;
