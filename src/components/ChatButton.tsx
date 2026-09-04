"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import ChatOverlay from "./ChatOverlay";

interface ChatButtonProps {
  driverId: string;
  driverName: string;
  driverImage: string;
  driverTicketExpiry?: string;
  driverVipStars?: number;
}

export default function ChatButton({ driverId, driverName, driverImage, driverTicketExpiry, driverVipStars }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group fixed bottom-6 right-6 md:bottom-10 md:right-10 z-40 w-20 h-20 md:w-24 md:h-24 flex items-center justify-center"
        aria-label="Chat with driver"
      >
        {/* Rotating text ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin-slow"
          viewBox="0 0 100 100"
        >
          <defs>
            <path
              id="chatCirclePath"
              d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
              fill="none"
            />
          </defs>
          <text className="fill-brand-primary dark:fill-brand-primary font-bold" style={{ fontSize: "11px", letterSpacing: "5px" }}>
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

      {isOpen && (
        <ChatOverlay
          driverId={driverId}
          driverName={driverName}
          driverImage={driverImage}
          driverTicketExpiry={driverTicketExpiry}
          driverVipStars={driverVipStars}
          onClose={() => setIsOpen(false)}
        />
      )}

    </>
  );
}
