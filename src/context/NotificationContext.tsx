"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: number;
  isRead: boolean;
  link?: string;
  image?: string;
  urlLabel?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (title: string, message: string, link?: string, image?: string, urlLabel?: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  deleteNotification: () => {},
  clearAll: () => {},
});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Load from local storage when user changes
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`notifications_${user.uid}`);
      if (stored) {
        try {
          setNotifications(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse notifications", e);
        }
      } else {
        setNotifications([]);
      }
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Save to local storage whenever notifications change
  useEffect(() => {
    if (user) {
      localStorage.setItem(`notifications_${user.uid}`, JSON.stringify(notifications));
    }
  }, [notifications, user]);

  // Fetch New Broadcasts
  useEffect(() => {
    if (!user || !profile) return;

    const lastChecked = localStorage.getItem(`lastBroadcastCheck_${user.uid}`) || "1970-01-01T00:00:00.000Z";
    
    const bQuery = query(
      collection(db, "broadcasts"),
      where("createdAt", ">", lastChecked),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(bQuery, (snapshot) => {
      if (snapshot.empty) {
        localStorage.setItem(`lastBroadcastCheck_${user.uid}`, new Date().toISOString());
        return;
      }

      const newNotifs: AppNotification[] = [];
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          // Filter by audience
          let targetMatch = false;
          const r = profile.role || "";
          if (data.audience === "All") targetMatch = true;
          else if (data.audience === "Drivers" && r === "driver") targetMatch = true;
          else if (data.audience === "Passengers" && r === "passenger") targetMatch = true;
          else if (data.audience === "Admins" && r === "admin") targetMatch = true;

          // Note: We removed the data.sentBy !== user.uid restriction so you can verify your own broadcasts
          if (targetMatch) {
            newNotifs.push({
              id: change.doc.id,
              title: data.title || "Broadcast",
              message: data.message,
              date: new Date(data.createdAt).getTime(),
              isRead: false,
              link: data.url,
              image: data.image,
              urlLabel: data.urlLabel
            });
          }
        }
      });

      if (newNotifs.length > 0) {
        setNotifications(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(n => n.id));
          const uniqueNew = newNotifs.filter(n => !existingIds.has(n.id));
          return [...uniqueNew.reverse(), ...prev];
        });
      }
      localStorage.setItem(`lastBroadcastCheck_${user.uid}`, new Date().toISOString());
    }, (err) => {
      console.error("Error listening to broadcasts:", err);
    });

    return () => unsubscribe();
  }, [user, profile]);

  // Fetch User-Specific Real-time Notifications
  useEffect(() => {
    if (!user) return;

    const lastChecked = localStorage.getItem(`lastUserNotifCheck_${user.uid}`) || "1970-01-01T00:00:00.000Z";
    const lastCheckedTime = new Date(lastChecked).getTime();
    
    // Simple query to avoid needing a complex composite index
    const nQuery = query(
      collection(db, "user_notifications"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(nQuery, (snapshot) => {
      if (snapshot.empty) {
        localStorage.setItem(`lastUserNotifCheck_${user.uid}`, new Date().toISOString());
        return;
      }

      const newNotifs: AppNotification[] = [];
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.createdAt > lastCheckedTime) {
            newNotifs.push({
              id: change.doc.id,
              title: data.title || "Notification",
              message: data.message,
              date: data.createdAt,
              isRead: false,
              link: data.link,
              image: data.image,
              urlLabel: data.urlLabel
            });
          }
        }
      });

      if (newNotifs.length > 0) {
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const uniqueNew = newNotifs.filter(n => !existingIds.has(n.id));
          // Sort new notifications so newest is first
          uniqueNew.sort((a, b) => b.date - a.date);
          return [...uniqueNew, ...prev];
        });
      }
      localStorage.setItem(`lastUserNotifCheck_${user.uid}`, new Date().toISOString());
    }, (err) => {
      console.error("Error listening to user notifications:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const addNotification = (title: string, message: string, link?: string, image?: string, urlLabel?: string) => {
    const newNotif: AppNotification = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      title,
      message,
      date: Date.now(),
      isRead: false,
      link,
      image,
      urlLabel,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Attach a global helper for testing notifications from the console
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).sendTestNotification = (title: string, msg: string) => {
        addNotification(title || "Test Notification", msg || "This is a test notification message.");
      };
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
