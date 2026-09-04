"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";

interface ChatInfo {
  chatId: string;
  driverId: string;
  passengerId: string;
  driverName: string;
  passengerName: string;
  driverImage: string;
  passengerImage: string;
  lastMessage: string;
  lastMessageAt: any;
  unreadCount: number;
}

interface ChatContextType {
  totalUnread: number;
  chats: ChatInfo[];
  chatsLoading: boolean;
}

const ChatContext = createContext<ChatContextType>({
  totalUnread: 0,
  chats: [],
  chatsLoading: true,
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [chatsLoading, setChatsLoading] = useState(true);
  const prevUnreadRef = useRef<Record<string, number>>({});
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!user) {
      setChats([]);
      setTotalUnread(0);
      setChatsLoading(false);
      initialLoadRef.current = true;
      prevUnreadRef.current = {};
      return;
    }

    // Listen to all chats where the current user is a participant
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList: ChatInfo[] = [];
      let total = 0;
      const newUnreadMap: Record<string, number> = {};

      // For each chat, count unread messages
      for (const chatDoc of snapshot.docs) {
        const data = chatDoc.data();
        
        // Count unread messages in this chat
        const messagesRef = collection(db, "chats", chatDoc.id, "messages");
        const unreadQuery = query(messagesRef, orderBy("createdAt", "desc"), limit(50));
        const messagesSnap = await getDocs(unreadQuery);
        
        let unreadCount = 0;
        messagesSnap.forEach((msgDoc) => {
          const msgData = msgDoc.data();
          // Don't count blocked messages or messages sent by self
          if (msgData.blocked && msgData.senderId !== user.uid) return;
          if (msgData.senderId === user.uid) return;
          if (!msgData.readBy || !msgData.readBy.includes(user.uid)) {
            unreadCount++;
          }
        });

        newUnreadMap[chatDoc.id] = unreadCount;
        total += unreadCount;

        chatList.push({
          chatId: chatDoc.id,
          driverId: data.driverId || "",
          passengerId: data.passengerId || "",
          driverName: data.driverName || "Driver",
          passengerName: data.passengerName || "Passenger",
          driverImage: data.driverImage || "",
          passengerImage: data.passengerImage || "",
          lastMessage: data.lastMessage || "",
          lastMessageAt: data.lastMessageAt,
          unreadCount,
        });
      }

      // Check for new messages and send notifications (skip initial load)
      if (!initialLoadRef.current) {
        for (const chatId of Object.keys(newUnreadMap)) {
          const prevCount = prevUnreadRef.current[chatId] || 0;
          const newCount = newUnreadMap[chatId];
          if (newCount > prevCount) {
            const chat = chatList.find((c) => c.chatId === chatId);
            if (chat) {
              const senderName = user.uid === chat.driverId ? chat.passengerName : chat.driverName;
              addNotification(
                "New Message",
                `${senderName}: ${chat.lastMessage?.substring(0, 50) || "Sent you a message"}${chat.lastMessage && chat.lastMessage.length > 50 ? "..." : ""}`
              );
            }
          }
        }
      }

      prevUnreadRef.current = newUnreadMap;
      initialLoadRef.current = false;

      // Sort by most recent message
      chatList.sort((a, b) => {
        const aTime = a.lastMessageAt?.toMillis?.() || a.lastMessageAt?.seconds * 1000 || 0;
        const bTime = b.lastMessageAt?.toMillis?.() || b.lastMessageAt?.seconds * 1000 || 0;
        return bTime - aTime;
      });

      setChats(chatList);
      setTotalUnread(total);
      setChatsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <ChatContext.Provider value={{ totalUnread, chats, chatsLoading }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
