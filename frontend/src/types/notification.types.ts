export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

export interface NotificationContextType {
  notifications: Notification[];
  showNotification: (
    type: NotificationType,
    message: string,
  ) => void;
  removeNotification: (id: number) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export interface NotificationItemProps {
  notification: Notification;
  onClose: (id: number) => void;
}