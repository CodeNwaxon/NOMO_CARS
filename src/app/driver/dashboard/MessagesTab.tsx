"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { MessageCircle, Clock } from "lucide-react";
import ChatOverlay from "@/components/ChatOverlay";

export default function MessagesTab({ userId }: { userId: string }) {
  const { profile } = useAuth();
  const { chats, chatsLoading } = useChat();
  const [selectedChat, setSelectedChat] = useState<any>(null);

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate?.() || (timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date());
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (chatsLoading) {
    return (
      <div className="max-w-5xl mx-auto pb-10">
        <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-brand-primary" /> Messages
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-xl p-4 animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-card-border" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-card-border rounded w-1/3" />
                <div className="h-3 bg-card-border rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageCircle className="w-6 h-6 text-brand-primary" /> Messages
      </h2>

      {chats.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-10 h-10 text-brand-primary/50" />
          </div>
          <h3 className="text-lg font-bold mb-2">No Conversations Yet</h3>
          <p className="text-sm text-foreground/60">
            When passengers message you, their conversations will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => {
            // Determine the other person's info
            const isDriverInChat = userId === chat.driverId;
            const otherName = isDriverInChat ? chat.passengerName : chat.driverName;
            const otherImage = isDriverInChat ? chat.passengerImage : chat.driverImage;
            const otherUserId = isDriverInChat ? chat.passengerId : chat.driverId;

            return (
              <button
                key={chat.chatId}
                onClick={() =>
                  setSelectedChat({
                    chatId: chat.chatId,
                    driverId: chat.driverId,
                    passengerId: chat.passengerId,
                    chatPartnerName: otherName,
                    chatPartnerImage: otherImage,
                    driverTicketExpiry: profile?.ticketExpiry,
                  })
                }
                className="w-full glass-panel rounded-xl p-3 md:p-4 flex items-center gap-3 md:gap-4 hover:shadow-lg transition-all text-left group border border-transparent hover:border-brand-primary/20"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 md:w-12 md:h-12 rounded-full overflow-hidden bg-card-border">
                    {otherImage ? (
                      <img src={otherImage} alt={otherName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-lg uppercase">
                        {otherName?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                      {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-sm font-bold truncate ${chat.unreadCount > 0 ? "text-foreground" : "text-foreground/80"}`}>
                      {otherName}
                    </h4>
                    <span className="text-[10px] text-foreground/40 flex items-center gap-0.5 flex-shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTimeAgo(chat.lastMessageAt)}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${chat.unreadCount > 0 ? "text-foreground/70 font-medium" : "text-foreground/50"}`}>
                    {chat.lastMessage || "No messages yet"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Chat Overlay when a conversation is selected */}
      {selectedChat && (
        <ChatOverlay
          chatId={selectedChat.chatId}
          driverId={selectedChat.driverId}
          passengerId={selectedChat.passengerId}
          chatPartnerName={selectedChat.chatPartnerName}
          chatPartnerImage={selectedChat.chatPartnerImage}
          driverTicketExpiry={selectedChat.driverTicketExpiry}
          onClose={() => setSelectedChat(null)}
        />
      )}
    </div>
  );
}
