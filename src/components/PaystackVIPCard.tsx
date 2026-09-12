"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Star, X } from "lucide-react";
import { usePaystackPayment } from "react-paystack";
import { createPendingPayment } from "@/actions/payment";

export default function PaystackVIPCard({ plan, profile, user, onSuccess, onClose, isProcessing, setProcessing }: any) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [reference] = useState(`vip_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`);

  const config = useMemo(() => ({
    reference: reference,
    email: user?.email || "user@nomocars.com",
    amount: plan.price * 100,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_9b16ad62bf9ea9b6eef84d379f866e3fa52e31e2",
    metadata: {
      userId: user?.uid,
      planType: "vip",
      planStars: plan.stars,
      planName: plan.name,
      planPrice: plan.price,
      custom_fields: []
    }
  }), [reference, user?.email, user?.uid, plan.price, plan.stars, plan.name]);

  const initializePayment = usePaystackPayment(config);

  const handlePurchase = async () => {
    if (isProcessing !== null) return;
    setShowConfirm(false);
    setProcessing(plan.stars);

    try {
      const prepared = await createPendingPayment({ reference: config.reference, userId: user.uid, type: "vip", amount: plan.price, planName: plan.name, planStars: plan.stars, planPrice: plan.price, userEmail: user.email || undefined });
      if (!prepared.success) {
        throw new Error(prepared.error || "Failed to prepare payment");
      }
      
      setTimeout(() => {
        initializePayment({
          onSuccess: (ref: any) => onSuccess(ref, plan),
          onClose: () => onClose(),
        });
      }, 100);
    } catch (error: any) {
      console.error("VIP purchase error:", error);
      const { toast } = await import("react-hot-toast");
      toast.error(error.message || "Something went wrong. Please try again.");
      setProcessing(null);
    }
  };

  const renderStars = (count: number, isPremium: boolean = false) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 md:w-5 md:h-5 ${i < count ? (isPremium ? "text-amber-400 fill-amber-400" : "text-yellow-500 fill-yellow-500") : "text-foreground/20"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div 
      className={`relative flex flex-col h-full rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${
        plan.isPremium ? plan.bg : `glass-panel ${plan.bg}`
      } border ${plan.border}`}
    >
      <div className={`absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider ${
        plan.isPremium ? 'bg-amber-500 text-black' : `bg-gradient-to-r ${plan.color} text-white`
      }`}>
        {plan.tag}
      </div>
      
      <div className="p-5 md:p-6 flex-1">
        <div className="mb-3">
          {renderStars(plan.stars, plan.isPremium)}
        </div>
        
        <h3 className={`text-xl font-black mb-1 ${plan.isPremium ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r ' + plan.color}`}>
          {plan.name}
        </h3>
        
        <div className="mb-4 flex items-baseline gap-1">
          <span className={`text-2xl md:text-3xl font-bold ${plan.isPremium ? 'text-white' : ''}`}>₦{plan.price.toLocaleString()}</span>
          <span className={`text-xs ${plan.isPremium ? 'text-slate-400' : 'text-foreground/50'}`}>/ {plan.durationDays} days</span>
        </div>

        <div className="space-y-2 mb-6">
          {plan.features.map((feature: string, idx: number) => (
            <div key={idx} className="flex items-start gap-2">
              <Check className={`w-3.5 h-3.5 mt-1 flex-shrink-0 ${plan.isPremium ? 'text-amber-400' : 'text-brand-primary'}`} />
              <span className={`text-xs md:text-sm ${plan.isPremium ? 'text-slate-300' : 'text-foreground/80'}`}>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 pt-0 mt-auto">
        {(profile?.vipStars || 0) <= plan.stars && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isProcessing !== null || (profile?.vipStars || 0) === plan.stars}
            className={`w-full py-2.5 md:py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all shadow-lg ${
              (profile?.vipStars || 0) === plan.stars
                ? "bg-foreground/10 text-foreground/50 cursor-not-allowed"
                : plan.isPremium
                ? "bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 shadow-amber-500/20"
                : `bg-gradient-to-r ${plan.color} text-white hover:opacity-90`
            }`}
          >
            {isProcessing === plan.stars ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (profile?.vipStars || 0) === plan.stars ? (
              "Current Plan"
            ) : (
              "Purchase VIP"
            )}
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      {mounted && showConfirm && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-left text-slate-900 dark:text-white">
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-4 text-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-2">Confirm VIP Upgrade</h3>
            <p className="text-sm text-foreground/70 mb-4">
              You are about to purchase the <b className={plan.isPremium ? 'text-amber-500' : 'text-brand-primary'}>{plan.name}</b> for <b className="text-foreground">₦{plan.price.toLocaleString()}</b>.
            </p>
            <div className="bg-card-border/30 p-3 rounded-lg mb-6 text-xs text-foreground/80">
              This plan will be active for {plan.durationDays} days from the moment of purchase. Please note that payments are final.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                className={`flex-1 py-2.5 font-semibold rounded-xl text-white transition-colors text-sm ${plan.isPremium ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand-primary hover:bg-brand-primary/90'}`}
              >
                Confirm & Pay
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
