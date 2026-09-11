"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Crown, Check, ArrowLeft, Loader2, Star } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "react-hot-toast";
import { usePaystackPayment } from "react-paystack";
import { finalizePayment, verifyAndNotifyPayment } from "@/actions/payment";
import { useNotifications } from "@/context/NotificationContext";
import { websiteLink } from "@/lib/constants";
import { onSnapshot } from "firebase/firestore";

const VIP_STYLES = [
  { color: "from-blue-400 to-blue-600", bg: "bg-blue-50/50 dark:bg-blue-900/10", border: "border-blue-200 dark:border-blue-800", features: ["Basic priority listing", "VIP Badge"], tag: "Starter" },
  { color: "from-green-400 to-green-600", bg: "bg-green-50/50 dark:bg-green-900/10", border: "border-green-200 dark:border-green-800", features: ["Enhanced priority listing", "Premium VIP Badge"], tag: "Popular" },
  { color: "from-purple-400 to-purple-600", bg: "bg-purple-50/50 dark:bg-purple-900/10", border: "border-purple-200 dark:border-purple-800", features: ["High priority listing", "Featured profile tag"], tag: "Advanced" },
  { color: "from-pink-400 to-rose-600", bg: "bg-pink-50/50 dark:bg-pink-900/10", border: "border-pink-200 dark:border-pink-800", features: ["Top-tier priority listing", "Exclusive support"], tag: "Premium" },
  { color: "from-slate-700 to-black dark:from-slate-300 dark:to-white", bg: "bg-gradient-to-br from-slate-900 to-black text-white shadow-2xl shadow-black/40", border: "border-slate-800", features: ["Ultimate priority listing", "Prestigious Black Card"], isPremium: true, tag: "Ultimate" }
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
  const [vipPlans, setVipPlans] = useState<any[]>([]);
  const [fetchingConfig, setFetchingConfig] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }

    if (!user) return;

    const pricingRef = doc(db, "adminSettings", "pricing");
    const unsubscribe = onSnapshot(pricingRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let loadedVips = data?.vip || [];

        // Ensure we always have 5 tiers, merging admin data if available
        const defaultVips = [
          { stars: 1, durationDays: 30, price: 5000, label: "1 Star VIP" },
          { stars: 2, durationDays: 30, price: 10000, label: "2 Star VIP" },
          { stars: 3, durationDays: 30, price: 15000, label: "3 Star VIP" },
          { stars: 4, durationDays: 30, price: 20000, label: "4 Star VIP" },
          { stars: 5, durationDays: 30, price: 25000, label: "5 Star VIP" }
        ];

        const fullVips = defaultVips.map(dv => {
          const found = loadedVips.find((v: any) => v.stars === dv.stars);
          return found ? found : dv;
        }).sort((a, b) => a.stars - b.stars);

        const mappedVip = fullVips.map((v: any, index: number) => {
          const style = VIP_STYLES[Math.min(index, VIP_STYLES.length - 1)];

          let dynamicFeatures = [...style.features];

          if (v.dailyBids && Number(v.dailyBids) > 1) {
            const extraBids = Number(v.dailyBids) - 1;
            dynamicFeatures.splice(1, 0, `${extraBids} Extra bid${extraBids > 1 ? 's' : ''} monthly`);
          }
          if (v.maxCars && Number(v.maxCars) > 1) {
            const extraCars = Number(v.maxCars) - 1;
            dynamicFeatures.splice(1, 0, `${extraCars} Extra vehicle slot${extraCars > 1 ? 's' : ''} for ${v.durationDays} days`);
          }
          if (v.maxRoutesPerCar && Number(v.maxRoutesPerCar) > 1) {
            const extraRoutes = Number(v.maxRoutesPerCar) - 1;
            dynamicFeatures.splice(1, 0, `${extraRoutes} Extra route${extraRoutes > 1 ? 's' : ''} per vehicle`);
          }

          return {
            stars: v.stars,
            price: v.price,
            name: v.label,
            durationDays: v.durationDays,
            ...style,
            features: dynamicFeatures
          };
        });
        setVipPlans(mappedVip);
      }
      setFetchingConfig(false);
    }, (error) => {
      console.error("Error listening to pricing:", error);
      setFetchingConfig(false);
    });

    return () => unsubscribe();
  }, [loading, user, router]);

  if (loading || fetchingConfig || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  const handlePurchaseSuccess = async (reference: any, plan: any) => {
    try {
      toast.success(`Payment successful! Your VIP status is being activated...`);

      const paymentReference = typeof reference === "string" ? reference : reference?.reference;
      if (!paymentReference) {
        throw new Error("Paystack did not return a transaction reference");
      }

      const finalized = await finalizePayment(paymentReference, user.uid);
      if (!finalized.success) {
        console.error("Immediate VIP finalization failed; webhook retry remains available:", finalized.error);
        toast("Payment received. Your receipt is still processing.", { icon: "i" });
      }

      // Keep the in-app notification alongside the verified receipt.
      addNotification(
        "VIP Upgrading",
        `Your payment for ${plan.name} was successful. Your account will be upgraded momentarily.`,
        `/receipt/${paymentReference}`
      );

      if (finalized.success) await refreshProfile();
      router.push(`/receipt/${paymentReference}`);

    } catch (error) {
      console.error("Error processing VIP success callback:", error);
      toast.error("Paystack succeeded, but receipt processing needs a retry. Your payment was not marked failed.");
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
            <p className="text-xs md:text-base text-foreground/70 mt-1">
              Boost your visibility and get exclusive benefits.
            </p>
          </div>
        </div>


        <div className="px-10 md:px-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {vipPlans.map((plan) => (
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
