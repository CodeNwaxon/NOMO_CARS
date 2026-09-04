"use client";

import { X, Trash2, Bell, CheckCircle2 } from "lucide-react";
import { useNotifications, AppNotification } from "@/context/NotificationContext";
import { useState } from "react";

export function NotificationPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { notifications, markAsRead, deleteNotification, clearAll } = useNotifications();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
      />
      
      {/* Sliding Panel */}
      <div className="fixed top-0 right-0 h-[100dvh] w-full max-w-md bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-slate-800 shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-primary" />
            <h2 className="text-xl font-bold">Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="text-xs font-medium text-foreground/60 hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Clear All
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clear All Confirmation */}
        {showClearConfirm && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/20">
            <p className="text-sm text-red-800 dark:text-red-200 mb-3 font-medium">Are you sure you want to delete all notifications?</p>
            <div className="flex gap-2">
              <button 
                onClick={() => { clearAll(); setShowClearConfirm(false); }}
                className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
              >
                Yes, Clear All
              </button>
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-foreground/40 space-y-3">
              <Bell className="w-12 h-12 opacity-20" />
              <p className="font-medium text-sm">No new notifications</p>
            </div>
          ) : (
            notifications.map((notif: AppNotification) => {
              const isExpanded = expandedId === notif.id;
              
              return (
                <div 
                  key={notif.id}
                  onClick={() => !notif.isRead && markAsRead(notif.id)}
                  className={`p-4 rounded-xl border transition-all relative group cursor-default ${
                    notif.isRead 
                      ? "bg-background border-gray-100 dark:border-slate-800" 
                      : "bg-brand-primary/5 border-brand-primary/20 shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {!notif.isRead && <div className="w-2 h-2 rounded-full bg-brand-primary flex-shrink-0" />}
                        <h4 className={`font-bold text-sm ${notif.isRead ? "text-foreground/80" : "text-foreground"}`}>
                          {notif.title}
                        </h4>
                      </div>
                      <span className="text-[10px] text-foreground/50 block mb-2">
                        {new Date(notif.date).toLocaleString()}
                      </span>
                      
                      <div className={`text-xs text-foreground/70 ${!isExpanded ? "line-clamp-2" : ""}`}>
                        {notif.message}
                      </div>
                      
                      {notif.message.length > 80 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : notif.id); }}
                          className="mt-2 text-xs font-bold text-brand-primary hover:underline"
                        >
                          {isExpanded ? "View Less" : "View More"}
                        </button>
                      )}
                      
                      {notif.link && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                            onClose();
                            window.location.href = notif.link!;
                          }}
                          className="mt-3 block w-full py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold rounded-lg transition-colors text-center"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                      className="p-1.5 text-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
