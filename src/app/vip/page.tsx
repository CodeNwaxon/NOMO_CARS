"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Crown, Check, ArrowLeft, Loader2, Star } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "react-hot-toast";
import { usePaystackPayment } from "react-paystack";
import { verifyAndNotifyPayment } from "@/actions/payment";
import { useNotifications } from "@/context/NotificationContext";
import { websiteLink, VIP_PLANS } from "@/lib/constants";

import dynamic from 'next/dynamic';

const PaystackVIPCard = dynamic(() => import('@/components/PaystackVIPCard'), {
  ssr: false,
  loading: () => <div className="h-64 rounded-3xl glass-panel animate-pulse bg-brand-primary/5"></div>
});

export default function VIPPage() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const { addNotification } = useNotifications();
  const router = useRouter();
  const [purchasing, setPurchasing] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  const handlePurchaseSuccess = async (reference: any, plan: typeof VIP_PLANS[0]) => {
    try {
      toast.success(`Payment successful! Your VIP status is being activated...`);
      
      // Notify the user locally so they see a response immediately.
      // The backend webhook will handle the actual Firestore update securely.
      addNotification(
        "VIP Upgrading",
        `Your payment for ${plan.name} was successful. Your account will be upgraded momentarily.`
      );

      // Wait a moment for the webhook to process before refreshing
      setTimeout(async () => {
        await refreshProfile();
        
        if (profile?.role === "driver") {
          router.push("/driver/dashboard");
        } else {
          router.push("/passenger/dashboard");
        }
      }, 2000);
      
    } catch (error) {
      console.error("Error processing VIP success callback:", error);
    } finally {
      setPurchasing(null);
    }
  };

  const handlePurchaseClose = () => {
    setPurchasing(null);
    toast.error("Payment was cancelled.");
  };

  return (
    <div className="min-h-screen bg-background pt-6 pb-24 px-4 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto z-10 relative">
        <div className="flex items-center gap-4 mb-8 md:mb-12">
          <button
            onClick={() => router.back()}
            className="p-2 md:p-3 bg-card-bg hover:bg-card-border border border-card-border rounded-full transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
          </button>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-3">
              <Crown className="w-8 h-8 md:w-10 md:h-10 text-amber-500" />
              Upgrade to VIP
            </h1>
            <p className="text-sm md:text-base text-foreground/70 mt-1">
              Boost your visibility and get exclusive benefits for 180 days.
            </p>
          </div>
        </div>


        <div className="px-10 md:px-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {VIP_PLANS.map((plan) => (
            <PaystackVIPCard
              key={plan.stars}
              plan={plan}
              profile={profile}
              user={user}
              isProcessing={purchasing}
              setProcessing={setPurchasing}
              onSuccess={handlePurchaseSuccess}
              onClose={handlePurchaseClose}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
