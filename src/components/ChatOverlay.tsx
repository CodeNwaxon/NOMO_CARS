"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Trash2, AlertTriangle, Languages, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  collection, doc, setDoc, addDoc, deleteDoc, getDocs,
  onSnapshot, query, orderBy, updateDoc, arrayUnion,
  serverTimestamp, Timestamp, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { websiteLink, getVIPBadge, hasValidTicket } from "@/lib/constants";

interface Message {
  id: string;
  senderId: string;
  text: string;
  blocked: boolean;
  readBy: string[];
  createdAt: Timestamp | Date | null | undefined;
}

interface ChatOverlayProps {
  driverId: string;
  chatPartnerName?: string;
  chatPartnerImage?: string;
  chatPartnerTicketExpiry?: string;
  chatPartnerVipStars?: number;
  driverName?: string;
  driverImage?: string;
  driverTicketExpiry?: string;
  driverVipStars?: number;
  onClose: () => void;
}

// ——— Content Filtering ———
const PHONE_REGEX = /(\+234|0)\d{10,11}/;
const URL_REGEX = /https?:\/\/\S+/gi;

function shouldBlockMessage(
  text: string,
  senderRole: "driver" | "passenger" | "admin",
  hasActiveTicket: boolean
): boolean {
  // 1. Check for external links
  const urls = text.match(URL_REGEX) || [];
  const hasExternalLink = urls.some((url) => !url.startsWith(websiteLink));
  if (hasExternalLink) return true;

  // 2. Check for phone numbers
  const hasPhone = PHONE_REGEX.test(text);
  if (hasPhone) {
    if (senderRole === "passenger") return true;
    if (senderRole === "driver" && !hasActiveTicket) return true;
  }

  return false;
}

function getChatId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join("_");
}

export default function ChatOverlay(props: ChatOverlayProps) {
  const { driverId, onClose } = props;
  const { user, profile } = useAuth();
  
  // Fallbacks for backward compatibility
  const chatPartnerName = props.chatPartnerName || props.driverName;
  const chatPartnerImage = props.chatPartnerImage || props.driverImage;
  const chatPartnerTicketExpiry = props.chatPartnerTicketExpiry || props.driverTicketExpiry;
  const chatPartnerVipStars = props.chatPartnerVipStars ?? props.driverVipStars;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [targetLang, setTargetLang] = useState("en");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const vipBadge = getVIPBadge(chatPartnerVipStars || 0);

  const chatId = user ? getChatId(user.uid, driverId) : "";
  const isDriver = user?.uid === driverId;

  // Determine if the driver (the one whose profile we're on) has an active ticket
  // If we are the driver, use our own profile ticket expiry, otherwise use the chat partner's
  const driverTicketExpiryValue = isDriver ? profile?.ticketExpiry : chatPartnerTicketExpiry;
  const driverHasTicket = hasValidTicket(driverTicketExpiryValue);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time message listener + 90-day cleanup
  useEffect(() => {
    if (!chatId || !user) return;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const msgs: Message[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const createdAt = data.createdAt?.toDate?.() || new Date();

        // Auto-delete messages older than 90 days
        if (createdAt < ninetyDaysAgo) {
          await deleteDoc(doc(db, "chats", chatId, "messages", docSnap.id));
          continue;
        }

        msgs.push({
          id: docSnap.id,
          senderId: data.senderId,
          text: data.text,
          blocked: data.blocked || false,
          readBy: data.readBy || [],
          createdAt: data.createdAt,
        });
      }

      setMessages(msgs);

      // Mark unread messages from others as read
      for (const msg of msgs) {
        if (msg.senderId !== user.uid && !msg.readBy.includes(user.uid) && !msg.blocked) {
          const msgRef = doc(db, "chats", chatId, "messages", msg.id);
          await updateDoc(msgRef, { readBy: arrayUnion(user.uid) });
        }
      }
    });

    return () => unsubscribe();
  }, [chatId, user]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !user || !profile || sending) return;

    const text = input.trim();
    setInput("");
    setSending(true);

    try {
      // Determine if the current sender's message should be blocked
      const senderIsDriver = profile.role === "driver" && user.uid === driverId;
      const senderRole = senderIsDriver ? "driver" : "passenger";
      
      // For the sender who is the driver of this chat: use the passed driverTicketExpiry
      // For a driver visiting another driver's profile (acting as passenger): treat as passenger
      const senderHasTicket = senderIsDriver ? driverHasTicket : false;
      const blocked = shouldBlockMessage(text, senderRole as "driver" | "passenger", senderHasTicket);

      // Ensure chat document exists
      const chatRef = doc(db, "chats", chatId);
      await setDoc(chatRef, {
        participants: [user.uid, driverId].sort(),
        driverId: driverId,
        passengerId: user.uid === driverId ? "" : user.uid,
        driverName: isDriver ? (profile.username || profile.firstName || "Driver") : chatPartnerName,
        passengerName: isDriver ? chatPartnerName : (profile.username || profile.firstName || "Passenger"),
        driverImage: isDriver ? (profile.displayImage || "") : chatPartnerImage,
        passengerImage: isDriver ? chatPartnerImage : (profile.displayImage || ""),
        lastMessage: blocked ? "[Filtered]" : text,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });

      // If the passengerId was empty (driver started the chat), update it
      if (isDriver && driverId === user.uid) {
        // The "other" user is the driver we're chatting with
        // This case is when a driver views their own messages tab
      }

      // Add message to subcollection
      const messagesRef = collection(db, "chats", chatId, "messages");
      await addDoc(messagesRef, {
        senderId: user.uid,
        text,
        blocked,
        readBy: [user.uid],
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!chatId) return;
    try {
      await deleteDoc(doc(db, "chats", chatId, "messages", messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate?.() || new Date();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" }) + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Filter messages: hide blocked messages from the recipient
  const visibleMessages = messages.filter((msg) => {
    if (msg.blocked && msg.senderId !== user?.uid) return false;
    return true;
  });

  const handleTranslate = async (msgId: string, text: string) => {
    if (translations[msgId]) return; // Already translated
    setTranslatingMsgId(msgId);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang }),
      });
      const data = await res.json();
      if (data.translatedText) {
        setTranslations(prev => ({ ...prev, [msgId]: data.translatedText }));
      }
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setTranslatingMsgId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center md:justify-end bg-black/50 backdrop-blur-sm">
      <div className="w-full md:w-[420px] h-[85vh] md:h-[70vh] md:mr-8 bg-white dark:bg-slate-950 rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-brand-primary text-white flex-shrink-0">
          <div className="relative">
            {vipBadge && (
              <div className={`absolute -top-1 -right-1 z-10 px-1 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider shadow-lg ${vipBadge.colorClass}`}>
                {vipBadge.tag}
              </div>
            )}
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 flex-shrink-0">
              {chatPartnerImage ? (
                <img src={chatPartnerImage} alt={chatPartnerName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg uppercase">
                  {chatPartnerName?.charAt(0) || "U"}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm truncate">{chatPartnerName}</h3>
            {chatPartnerTicketExpiry && (
              <p className="text-[10px] text-white/70">
                {new Date(chatPartnerTicketExpiry) > new Date() ? "Verified Driver" : "Ticket Expired"}
              </p>
            )}
          </div>
          
          {/* Language Selector */}
          <div className="flex items-center bg-white/10 rounded-lg px-2 py-1 flex-shrink-0 border border-white/20">
            <Languages className="w-3.5 h-3.5 mr-1" />
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-transparent text-white text-[10px] font-bold outline-none cursor-pointer appearance-none pr-1"
            >
              <option value="en" className="text-black">EN</option>
              <option value="ig" className="text-black">Igbo</option>
              <option value="ha" className="text-black">Hausa</option>
              <option value="yo" className="text-black">Yoruba</option>
            </select>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors flex-shrink-0 ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-delete notice */}
        <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/30 flex-shrink-0">
          <p className="text-[10px] text-amber-700 dark:text-amber-400 text-center flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Messages older than 90 days are automatically deleted
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50 dark:bg-slate-900/50">
          {visibleMessages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-center py-12">
              <div>
                <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Send className="w-7 h-7 text-brand-primary" />
                </div>
                <p className="text-sm font-medium text-foreground/70">No messages yet</p>
                <p className="text-xs text-foreground/50 mt-1">Start the conversation!</p>
              </div>
            </div>
          )}

          {visibleMessages.map((msg) => {
            const isMine = msg.senderId === user?.uid;
            const isDriverMsg = msg.senderId === driverId;

            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className={`group relative max-w-[80%] ${isMine ? "order-2" : "order-1"}`}>
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.blocked
                        ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 line-through"
                        : isMine
                          ? "bg-brand-primary text-white rounded-br-md"
                          : isDriverMsg
                            ? "bg-blue-500 text-white rounded-bl-md"
                            : "bg-emerald-500 text-white rounded-bl-md"
                    }`}
                  >
                    <div>{msg.text}</div>
                    
                    {/* Translated Text Display */}
                    {translations[msg.id] && (
                      <div className="mt-1.5 pt-1.5 border-t border-white/20 text-xs opacity-90 italic">
                        {translations[msg.id]}
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex items-center gap-1.5 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] text-foreground/40">{formatTime(msg.createdAt)}</span>
                    
                    {!isMine && !msg.blocked && (
                      <button
                        onClick={() => handleTranslate(msg.id, msg.text)}
                        disabled={translatingMsgId === msg.id}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-brand-primary hover:text-brand-primary/80 transition-all text-[10px] font-medium flex items-center gap-1"
                      >
                        {translatingMsgId === msg.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Languages className="w-3 h-3" /> 
                        )}
                        Translate
                      </button>
                    )}

                    {isMine && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-500 transition-all"
                        title="Delete message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-2.5 bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="p-2.5 bg-brand-primary text-white rounded-full hover:bg-brand-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
