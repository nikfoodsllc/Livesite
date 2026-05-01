'use client';

import React, { useState, useCallback } from 'react';
import { Snackbar, Alert, AlertTitle, useTheme } from '@mui/material';
import { IconCheck, IconX, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';

export interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: NotificationProps[];
  showNotification: (notification: Omit<NotificationProps, 'id'>) => void;
  hideNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationItemProps {
  notification: NotificationProps;
  onClose: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const theme = useTheme();

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <IconCheck size={20} />;
      case 'error':
        return <IconX size={20} />;
      case 'warning':
        return <IconAlertTriangle size={20} />;
      case 'info':
        return <IconInfoCircle size={20} />;
      default:
        return <IconInfoCircle size={20} />;
    }
  };

  const getAlertStyles = () => {
    const baseStyles = {
      borderRadius: '12px',
      alignItems: 'center',
      '& .MuiAlert-icon': {
        display: 'flex',
        alignItems: 'center',
      },
      '& .MuiAlert-message': {
        width: '100%',
      },
    };

    switch (notification.type) {
      case 'success':
        return {
          ...baseStyles,
          backgroundColor: theme.palette.success.main,
          color: '#fff',
          border: `1px solid ${theme.palette.success.main}`,
          '& .MuiAlert-icon': {
            color: '#fff',
          },
        };
      case 'error':
        return {
          ...baseStyles,
          backgroundColor: theme.palette.error.main,
          color: '#fff',
          border: `1px solid ${theme.palette.error.main}`,
          '& .MuiAlert-icon': {
            color: '#fff',
          },
        };
      case 'warning':
        return {
          ...baseStyles,
          backgroundColor: theme.palette.warning.main,
          color: '#fff',
          border: `1px solid ${theme.palette.warning.main}`,
          '& .MuiAlert-icon': {
            color: '#fff',
          },
        };
      case 'info':
        return {
          ...baseStyles,
          backgroundColor: theme.palette.info.main,
          color: '#fff',
          border: `1px solid ${theme.palette.info.main}`,
          '& .MuiAlert-icon': {
            color: '#fff',
          },
        };
      default:
        return baseStyles;
    }
  };

  return (
    <Alert
      icon={getIcon()}
      severity={notification.type}
      onClose={() => onClose(notification.id)}
      sx={getAlertStyles()}
    >
      {notification.title && (
        <AlertTitle sx={{ fontWeight: 600, mb: 0.25 }}>
          {notification.title}
        </AlertTitle>
      )}
      {notification.message}
    </Alert>
  );
};

interface NotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  maxNotifications = 3
}) => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback((notification: Omit<NotificationProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: NotificationProps = {
      ...notification,
      id,
      duration: notification.duration ?? 4000,
    };

    setNotifications(prev => {
      const updated = [...prev, newNotification];
      // Limit the number of notifications shown at once
      return updated.slice(-maxNotifications);
    });

    // Auto-hide notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, newNotification.duration);
    }
  }, [maxNotifications, hideNotification]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Group notifications by position for stacking
  const activeNotifications = notifications.slice(-maxNotifications);

  return (
    <NotificationContext.Provider
      value={{
        notifications: activeNotifications,
        showNotification,
        hideNotification,
        clearAllNotifications,
      }}
    >
      {children}

      {/* Notification Container */}
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {activeNotifications.map((notification, index) => (
          <div
            key={notification.id}
            style={{
              pointerEvents: 'auto',
              marginBottom: index < activeNotifications.length - 1 ? 8 : 0,
              transform: `translateY(${index * 10}px)`,
              opacity: 1 - (index * 0.1),
              transition: 'all 0.3s ease',
            }}
          >
            <NotificationItem
              notification={notification}
              onClose={hideNotification}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// Helper functions for common notification types
export const showSuccessNotification = (
  showNotification: (notification: Omit<NotificationProps, 'id'>) => void,
  message: string,
  title?: string
) => {
  showNotification({
    type: 'success',
    title,
    message,
    duration: 3000,
  });
};

export const showErrorNotification = (
  showNotification: (notification: Omit<NotificationProps, 'id'>) => void,
  message: string,
  title?: string
) => {
  showNotification({
    type: 'error',
    title,
    message,
    duration: 5000,
  });
};

export const showInfoNotification = (
  showNotification: (notification: Omit<NotificationProps, 'id'>) => void,
  message: string,
  title?: string
) => {
  showNotification({
    type: 'info',
    title,
    message,
    duration: 4000,
  });
};

export const showWarningNotification = (
  showNotification: (notification: Omit<NotificationProps, 'id'>) => void,
  message: string,
  title?: string
) => {
  showNotification({
    type: 'warning',
    title,
    message,
    duration: 4000,
  });
};