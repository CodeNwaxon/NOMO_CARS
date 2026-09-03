"use client";

import { Check, Loader2 } from "lucide-react";
import { usePaystackPayment } from "react-paystack";

export default function PaystackTicketCard({ plan, user, profile, onSuccess, onClose, isProcessing, setProcessing }: any) {
  const config = {
    reference: "ticket_" + new Date().getTime().toString(),
    email: user?.email || "driver@nomocars.com",
    amount: plan.price * 100, // Paystack expects kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_9b16ad62bf9ea9b6eef84d379f866e3fa52e31e2",
  };

  const initializePayment = usePaystackPayment(config);

  const handlePurchase = () => {
    if (isProcessing !== null) return;
    setProcessing(plan.days);
    
    setTimeout(() => {
      initializePayment({
        onSuccess: (ref: any) => onSuccess(ref, plan),
        onClose: () => onClose(),
      });
    }, 100);
  };

  return (
    <div 
      className={`relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${
        plan.isPremium ? plan.bg : `glass-panel ${plan.bg}`
      } border ${plan.border}`}
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
            <span className="text-sm text-foreground/80">Full app access for {plan.days} {plan.days === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className={`w-4 h-4 mt-1 flex-shrink-0 ${plan.isPremium ? 'text-amber-500' : 'text-brand-primary'}`} />
            <span className="text-sm text-foreground/80">Priority passenger matching</span>
          </div>
        </div>
      </div>

      <div className="p-6 pt-0 mt-auto">
        <button
          onClick={handlePurchase}
          disabled={isProcessing !== null}
          className={`w-full py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all shadow-lg ${
            plan.isPremium
              ? "bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 shadow-amber-500/20"
              : "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-brand-primary/20"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isProcessing === plan.days ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Purchase Ticket"
          )}
        </button>
      </div>
    </div>
  );
}
