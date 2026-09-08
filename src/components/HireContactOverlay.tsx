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
  vehicleName?: string;
  onClose: () => void;
}

export default function HireContactOverlay({ driverId, vehicleName, onClose }: HireContactOverlayProps) {
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="bg-background dark:bg-[#0f172a] bg-[#f8fafc] border border-card-border rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200 mx-4">
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
                href={`https://wa.me/${driverData.phone.replace(/^0/, '234')}?text=${encodeURIComponent(vehicleName ? `Hello! I found you on Nomo Cars and would like to hire your services for *${vehicleName}*.` : "Hello! I found you on Nomo Cars and would like to hire your services.")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors font-medium shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.272-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
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
