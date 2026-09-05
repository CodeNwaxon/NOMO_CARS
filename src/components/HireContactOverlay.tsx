"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Phone, MessageSquare, MessageCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";

interface HireContactOverlayProps {
  driverId: string;
  onClose: () => void;
}

export default function HireContactOverlay({ driverId, onClose }: HireContactOverlayProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDriver = async () => {
      try {
        const docSnap = await getDoc(doc(db, "users", driverId));
        if (docSnap.exists()) {
          setDriverData(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching driver contact info:", err);
      } finally {
        setLoading(false);
      }
    };
    if (driverId) {
      fetchDriver();
    }
  }, [driverId]);

  const handleChat = () => {
    if (!user) {
      toast.error("Please sign in to chat with drivers.");
      return;
    }
    // Set auto-open chat query param when routing to the driver's profile
    router.push(`/driver/profile/${driverId}?chat=open`);
    onClose();
  };

  const hasPhone = driverData?.phone && driverData.phone.trim().length > 0;
  // Based on user prompt: "we have set up whatsApp toggle on both drivers and passengers dasshboard check for it."
  const isWhatsAppEnabled = driverData?.whatsappEnabled && hasPhone;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="bg-background dark:bg-[#0f172a] bg-[#f8fafc] border border-card-border rounded-t-3xl md:rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-card-border/50 text-foreground/50 hover:bg-card-border hover:text-foreground transition-all"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center mb-8 mt-2">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-primary/20">
            {driverData?.displayImage ? (
              <img src={driverData.displayImage} alt="Driver" className="w-full h-full rounded-full object-cover" />
            ) : (
              <UserPlaceholder />
            )}
          </div>
          <h2 className="text-xl font-bold">Contact Driver</h2>
          <p className="text-sm text-foreground/60 mt-1">
            {loading ? "Loading..." : driverData ? `Reach out to ${driverData.username || driverData.firstName}` : "Driver not found"}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {hasPhone ? (
              <a 
                href={`tel:${driverData.phone}`}
                onClick={onClose}
                className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm md:text-base text-left">Call Driver</span>
                  <span className="text-xs opacity-70">{driverData.phone}</span>
                </div>
              </a>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 opacity-50" />
                </div>
                <span className="text-sm md:text-base">No Phone Number</span>
              </div>
            )}

            {isWhatsAppEnabled && hasPhone && (
              <a 
                href={`https://wa.me/${driverData.phone.replace(/^0/, '234')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors font-medium shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm md:text-base text-left">WhatsApp</span>
                  <span className="text-xs opacity-70">Message directly</span>
                </div>
              </a>
            )}

            <button 
              onClick={handleChat}
              className="flex items-center gap-3 p-4 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/20 transition-colors font-medium shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm md:text-base text-left">In-App Chat</span>
                <span className="text-xs opacity-70">Secure messaging</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function UserPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-brand-primary">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
