"use client";

import { useState, useEffect } from "react";
import { MessageCircle, LogIn, X, Loader2 } from "lucide-react";
import ChatOverlay from "./ChatOverlay";
import type { User } from "firebase/auth";

interface ChatButtonProps {
  driverId: string;
  driverName: string;
  driverImage: string;
  driverTicketExpiry?: string;
  driverVipStars?: number;
  autoOpen?: boolean;
  user?: User | null;
  signInWithGoogle?: () => Promise<void>;
}

export default function ChatButton({ driverId, driverName, driverImage, driverTicketExpiry, driverVipStars, autoOpen, user, signInWithGoogle }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // Auto-open chat when arriving from a notification link
  useEffect(() => {
    if (autoOpen && user) {
      setIsOpen(true);
    }
  }, [autoOpen, user]);

  const handleClick = () => {
    if (user) {
      setIsOpen(true);
    } else {
      setShowSignIn(true);
    }
  };

  const handleSignIn = async () => {
    if (!signInWithGoogle) return;
    setSigningIn(true);
    try {
      await signInWithGoogle();
      setShowSignIn(false);
      setIsOpen(true);
    } catch (err) {
      console.error("Sign in error:", err);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="group fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 w-20 h-20 md:w-24 md:h-24 flex items-center justify-center"
        aria-label="Chat with driver"
      >
        {/* Rotating text ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin-slow z-20"
          viewBox="0 0 100 100"
        >
          <defs>
            <path
              id="chatCirclePath"
              d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
              fill="none"
            />
          </defs>
          <text className="z-50 fill-brand-primary dark:fill-brand-primary font-bold" style={{ fontSize: "11px", letterSpacing: "5px" }}>
            <textPath href="#chatCirclePath" startOffset="0%">
              CHAT ME UP • CHAT ME UP •
            </textPath>
          </text>
        </svg>

        {/* Center icon */}
        <div className="relative z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-xl shadow-brand-primary/30 group-hover:scale-110 transition-transform">
          <MessageCircle className="w-6 h-6 md:w-7 md:h-7" />
        </div>
      </button>

      {isOpen && user && (
        <ChatOverlay
          driverId={driverId}
          driverName={driverName}
          driverImage={driverImage}
          driverTicketExpiry={driverTicketExpiry}
          driverVipStars={driverVipStars}
          onClose={() => setIsOpen(false)}
        />
      )}

      {/* Sign-in Prompt Modal */}
      {showSignIn && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center relative">
            <button
              onClick={() => setShowSignIn(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4 text-foreground/60" />
            </button>
            <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-brand-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2 dark:text-white">Sign in to Chat</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Sign in with your Google account to start chatting with {driverName}.
            </p>
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {signingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {signingIn ? "Signing in..." : "Sign in with Google"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
