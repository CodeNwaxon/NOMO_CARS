"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { Ticket, ArrowLeft, Loader2, Check } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "react-hot-toast";
import { usePaystackPayment } from "react-paystack";
import { verifyAndNotifyPayment } from "@/actions/payment";
import { startTicketCollection, freeTicketPlanDays, ticketCollectionStartDate } from "@/lib/constants";
const TICKET_PLANS = [
  { days: 1, price: 300, name: "1 Day Ticket", color: "from-green-400 to-green-600", bg: "bg-green-50/50 dark:bg-green-900/10", border: "border-green-200 dark:border-green-800" },
  { days: 7, price: 1200, name: "7 Days Ticket", color: "from-blue-400 to-blue-600", bg: "bg-blue-50/50 dark:bg-blue-900/10", border: "border-blue-200 dark:border-blue-800" },
  { days: 14, price: 1800, name: "2 Weeks Ticket", color: "from-purple-400 to-purple-600", bg: "bg-purple-50/50 dark:bg-purple-900/10", border: "border-purple-200 dark:border-purple-800" },
  { days: 30, price: 2500, name: "1 Month Ticket", color: "from-amber-400 to-amber-600", bg: "bg-amber-50/50 dark:bg-amber-900/10", border: "border-amber-200 dark:border-amber-800", isPremium: true },
];

import dynamic from 'next/dynamic';

const PaystackTicketCard = dynamic(() => import('@/components/PaystackTicketCard'), {
  ssr: false,
  loading: () => <div className="h-64 rounded-3xl glass-panel animate-pulse bg-brand-primary/5"></div>
});

export default function TicketPage() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const { addNotification } = useNotifications();
  const router = useRouter();

  const [processingPlan, setProcessingPlan] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "driver")) {
      router.push("/");
    }
  }, [loading, user, profile, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  const handlePurchaseSuccess = async (reference: any, plan: typeof TICKET_PLANS[0]) => {
    try {
      // 1. Update Firestore
      const docRef = doc(db, "users", user.uid);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + plan.days);

      await updateDoc(docRef, {
        ticketExpiry: expiryDate.toISOString(),
        lastTicketPrice: plan.price,
        lastTicketDays: plan.days,
      });
      await refreshProfile();

      // 2. Add In-App Notification
      addNotification(
        "Ticket Purchased",
        `You have successfully purchased a ${plan.name}. Valid until ${expiryDate.toLocaleDateString()}.`
      );

      // 3. Call Server Action to Verify & Email
      toast.success("Payment successful! Finalizing your ticket...");
      const res = await verifyAndNotifyPayment(
        reference.reference,
        user.email || "",
        profile?.username || profile?.firstName || "Driver",
        plan.name,
        plan.price
      );

      if (!res.success) {
        console.error("Verification warning:", res.error);
      }

      router.push("/driver/dashboard");
    } catch (error) {
      console.error("Error finalizing purchase:", error);
      toast.error("An error occurred while finalizing your ticket.");
    } finally {
      setProcessingPlan(null);
    }
  };

  const handlePurchaseClose = () => {
    setProcessingPlan(null);
    toast.error("Payment was cancelled.");
  };

  return (
    <div className="min-h-screen bg-background pt-6 pb-24 px-4 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-5xl mx-auto z-10 relative">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 md:p-3 bg-card-bg hover:bg-card-border border border-card-border rounded-full transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
              <Ticket className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
              Purchase Ticket
            </h1>
            <p className="text-xs md:text-sm text-foreground/70 mt-1">
              Buy a ticket to operate and match with passengers on Nomo Cars.
            </p>
          </div>
        </div>

        {(() => {
          const hasOwnTicket = profile?.ticketExpiry && new Date(profile.ticketExpiry) > new Date();
          
          let hasGlobalFree = false;
          let globalFreeDaysLeft = 0;
          if (startTicketCollection) {
            const startDate = new Date(ticketCollectionStartDate);
            const freePeriodEnd = new Date(startDate.getTime() + freeTicketPlanDays * 24 * 60 * 60 * 1000);
            const globalFreeMsLeft = freePeriodEnd.getTime() - new Date().getTime();
            if (globalFreeMsLeft > 0) {
              hasGlobalFree = true;
              globalFreeDaysLeft = Math.ceil(globalFreeMsLeft / (1000 * 60 * 60 * 24));
            }
          }

          return (
            <>
              {!startTicketCollection && (
                <div className="mb-8 p-4 md:p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-800 dark:text-blue-300">Ticket Collection Paused</h3>
                    <p className="text-sm text-blue-700/80 dark:text-blue-400/80">
                      You do not currently need a ticket to operate on Nomo Cars.
                    </p>
                  </div>
                </div>
              )}

              {startTicketCollection && hasGlobalFree && !hasOwnTicket && (
                <div className="mb-8 p-4 md:p-6 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-purple-800 dark:text-purple-300">Global Free Plan Active</h3>
                    <p className="text-sm text-purple-700/80 dark:text-purple-400/80">
                      You currently have {globalFreeDaysLeft} days left of free access. You can purchase a ticket now to extend your time after the free period ends.
                    </p>
                  </div>
                </div>
              )}

              {hasOwnTicket && (
                <div className="mb-8 p-4 md:p-6 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-800 dark:text-green-300">Active Purchased Ticket</h3>
                    <p className="text-sm text-green-700/80 dark:text-green-400/80">
                      Your current ticket expires on {new Date(profile.ticketExpiry!).toLocaleDateString()}. Purchasing a new one will overwrite it.
                    </p>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        <div className="px-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {TICKET_PLANS.map((plan) => (
            <PaystackTicketCard
              key={plan.days}
              plan={plan}
              user={user}
              profile={profile}
              isProcessing={processingPlan}
              setProcessing={setProcessingPlan}
              onSuccess={handlePurchaseSuccess}
              onClose={handlePurchaseClose}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
