"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, X } from "lucide-react";
import { usePaystackPayment } from "react-paystack";
import { createPendingPayment } from "@/actions/payment";
import { toast } from "react-hot-toast";

export default function PaystackTicketCard({ plan, user, profile, onSuccess, onClose, isProcessing, setProcessing, hasOwnTicket }: any) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [reference] = useState(`ticket_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`);

  const config = useMemo(() => ({
    reference: reference,
    email: user?.email || "driver@nomocars.com",
    amount: plan.price * 100, // Paystack expects kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_9b16ad62bf9ea9b6eef84d379f866e3fa52e31e2",
    metadata: {
      userId: user?.uid,
      planType: "ticket",
      planDays: plan.days,
      planName: plan.name,
      planPrice: plan.price,
      custom_fields: []
    }
  }), [reference, user?.email, user?.uid, plan.price, plan.days, plan.name]);

  const initializePayment = usePaystackPayment(config);

  const handlePurchase = async () => {
    if (isProcessing !== null || hasOwnTicket) return;
    setShowConfirm(false);
    setProcessing(plan.days);

    try {
      const prepared = await createPendingPayment({
        reference: config.reference,
        userId: user.uid,
        type: "ticket",
        amount: plan.price,
        planName: plan.name,
        planDays: plan.days,
        planPrice: plan.price,
        userEmail: user.email || undefined,
      });
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
      console.error("Ticket purchase error:", error);
      toast.error("Error processing your payment. Please try again later.");
      setProcessing(null);
    }
  };

  return (
    <div 
      className={`relative flex flex-col h-full rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${
        plan.isPremium ? plan.bg : `glass-panel ${plan.bg}`
      } border ${plan.border} ${hasOwnTicket ? 'opacity-75 grayscale-[0.5]' : ''}`}
    >
      {plan.isPremium && (
        <div className="absolute top-0 right-0 bg-amber-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
          Best Value
        </div>
      )}
      
      <div className="p-6 flex-1">
        <h3 className={`text-xl font-black mb-2 ${plan.isPremium ? 'text-amber-600 dark:text-amber-400' : 'text-transparent bg-clip-text bg-gradient-to-r ' + plan.color}`}>
          {plan.name}
        </h3>
        
        <div className="mb-4 flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${plan.isPremium ? 'text-amber-700 dark:text-amber-500' : ''}`}>₦{plan.price.toLocaleString()}</span>
          <span className="text-sm text-foreground/50">/ {plan.days} {plan.days === 1 ? 'day' : 'days'}</span>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-2">
            <Check className={`w-4 h-4 mt-1 flex-shrink-0 ${plan.isPremium ? 'text-amber-500' : 'text-brand-primary'}`} />
            <span className="text-sm text-foreground/80">Full work access for {plan.days} {plan.days === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className={`w-4 h-4 mt-1 flex-shrink-0 ${plan.isPremium ? 'text-amber-500' : 'text-brand-primary'}`} />
            <span className="text-sm text-foreground/80">Priority passenger matching</span>
          </div>
          {plan.days >= 14 && (
            <div className="flex items-start gap-2">
              <Check className={`w-4 h-4 mt-1 flex-shrink-0 ${plan.isPremium ? 'text-amber-500' : 'text-brand-primary'}`} />
              <span className="text-sm text-foreground/80">Share & promote your vehicles to attract more customers</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 pt-0 mt-auto">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isProcessing !== null || hasOwnTicket}
          className={`w-full py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all shadow-lg ${
            hasOwnTicket
              ? "bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-400 shadow-none"
              : plan.isPremium
                ? "bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 shadow-amber-500/20"
                : plan.days === 14
                  ? "bg-gradient-to-r from-purple-400 to-purple-600 text-white hover:opacity-90 shadow-purple-500/20"
                  : "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-brand-primary/20"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isProcessing === plan.days ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : hasOwnTicket ? (
            "Active Ticket"
          ) : (
            "Purchase Ticket"
          )}
        </button>
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
            <h3 className="text-xl font-bold mb-2">Confirm Ticket Purchase</h3>
            <p className="text-sm text-foreground/70 mb-4">
              You are about to purchase the <b className={plan.isPremium ? 'text-amber-500' : 'text-brand-primary'}>{plan.name}</b> for <b className="text-foreground">₦{plan.price.toLocaleString()}</b>.
            </p>
            <div className="bg-card-border/30 p-3 rounded-lg mb-6 text-xs text-foreground/80">
              This ticket will be active for {plan.days} days from the moment of purchase. Please note that payments are final.
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
