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

const VIP_PLANS = [
  {
    stars: 1,
    price: 5000,
    name: "VIP 1-Star",
    color: "from-blue-400 to-blue-600",
    bg: "bg-blue-50/50 dark:bg-blue-900/10",
    border: "border-blue-200 dark:border-blue-800",
    features: ["Basic priority listing", "Extra bid daily", "VIP Badge"],
  },
  {
    stars: 2,
    price: 7000,
    name: "VIP 2-Star",
    color: "from-green-400 to-green-600",
    bg: "bg-green-50/50 dark:bg-green-900/10",
    border: "border-green-200 dark:border-green-800",
    features: ["Enhanced priority listing", "3 Extra bids daily", "Premium VIP Badge"],
  },
  {
    stars: 3,
    price: 10000,
    name: "VIP 3-Star",
    color: "from-purple-400 to-purple-600",
    bg: "bg-purple-50/50 dark:bg-purple-900/10",
    border: "border-purple-200 dark:border-purple-800",
    features: ["High priority listing", "5 Extra bids daily", "Featured profile tag"],
  },
  {
    stars: 4,
    price: 15000,
    name: "VIP 4-Star",
    color: "from-pink-400 to-rose-600",
    bg: "bg-pink-50/50 dark:bg-pink-900/10",
    border: "border-pink-200 dark:border-pink-800",
    features: ["Top-tier priority listing", "10 Extra bids daily", "Exclusive support"],
  },
  {
    stars: 5,
    price: 20000,
    name: "VIP 5-Star",
    color: "from-slate-700 to-black dark:from-slate-300 dark:to-white",
    bg: "bg-gradient-to-br from-slate-900 to-black text-white shadow-2xl shadow-black/40",
    border: "border-slate-800",
    features: ["Ultimate priority listing", "Unlimited bids daily", "Prestigious Black Card", "Dedicated Account Manager"],
    isPremium: true,
  }
];

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
      const docRef = doc(db, "users", user.uid);
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 180);
      
      await updateDoc(docRef, {
        vipStars: plan.stars,
        vipExpiry: expiryDate.toISOString(),
      });

      await refreshProfile();
      toast.success(`Successfully upgraded to ${plan.name}!`);
      
      addNotification(
        "VIP Upgraded",
        `You have successfully upgraded to ${plan.name}. Valid for 180 days.`
      );
      
      const res = await verifyAndNotifyPayment(
        reference.reference,
        user.email || "",
        profile?.username || profile?.firstName || "User",
        plan.name,
        plan.price
      );

      if (!res.success) {
        console.error("Verification warning:", res.error);
      }
      
      if (profile?.role === "driver") {
        router.push("/driver/dashboard");
      } else {
        router.push("/passenger/dashboard");
      }
    } catch (error) {
      console.error("Error purchasing VIP:", error);
      toast.error("Failed to process VIP purchase.");
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

        <div className="mb-10 p-6 md:p-8 glass-panel rounded-2xl md:rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg md:text-xl font-bold mb-2">Referral Program</h3>
            <p className="text-sm md:text-base text-foreground/70 max-w-2xl">
              Share your unique referral link! Every user that joins through your link earns you <span className="font-bold text-brand-primary">2 points</span>. 
              Collect <span className="font-bold text-amber-500">20 points</span> to earn a VIP star for free. Max 5 stars (100 points).
            </p>
          </div>
          <div className="flex items-center justify-center p-4 bg-brand-primary/10 rounded-2xl w-full md:w-auto">
            <div className="text-center">
              <p className="text-xs text-brand-primary font-bold uppercase tracking-wider mb-1">Your Points</p>
              <p className="text-3xl md:text-4xl font-black text-brand-primary">{profile?.points || 0}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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
