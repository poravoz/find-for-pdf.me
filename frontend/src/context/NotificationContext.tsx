
import {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
  } from 'react';
  
  import type {
    Notification,
    NotificationContextType,
    NotificationType,
  } from '../types/notification.types';
  
  const NotificationContext =
    createContext<NotificationContextType | null>(null);
  
  export function NotificationProvider({
    children,
  }: {
    children: ReactNode;
  }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
  
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
      return localStorage.getItem('notifications-enabled') !== 'false';
    });
  
    const updateNotificationsEnabled = (enabled: boolean) => {
      setNotificationsEnabled(enabled);
      localStorage.setItem('notifications-enabled', String(enabled));
    };
  
    const showNotification = useCallback(
      (type: NotificationType, message: string) => {
        if (!notificationsEnabled && type !== 'error') {
          return;
        }
  
        const id = Date.now() + Math.random();
  
        setNotifications((prev) => [
          ...prev,
          { id, type, message },
        ]);
  
        window.setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((item) => item.id !== id),
          );
        }, 4000);
      },
      [notificationsEnabled],
    );
  
    const removeNotification = useCallback((id: number) => {
      setNotifications((prev) =>
        prev.filter((item) => item.id !== id),
      );
    }, []);
  
    return (
      <NotificationContext.Provider
        value={{
          notifications,
          showNotification,
          removeNotification,
          notificationsEnabled,
          setNotificationsEnabled: updateNotificationsEnabled,
        }}
      >
        {children}
      </NotificationContext.Provider>
    );
  }
  
  export function useNotification() {
    const context = useContext(NotificationContext);
  
    if (!context) {
      throw new Error(
        'useNotification must be used within NotificationProvider',
      );
    }
  
    return context;
  }
  