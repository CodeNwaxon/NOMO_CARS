"use client";

import { Check, Loader2, Star } from "lucide-react";
import { usePaystackPayment } from "react-paystack";

export default function PaystackVIPCard({ plan, profile, user, onSuccess, onClose, isProcessing, setProcessing }: any) {
  const config = {
    reference: "vip_" + new Date().getTime().toString(),
    email: user?.email || "user@nomocars.com",
    amount: plan.price * 100,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_9b16ad62bf9ea9b6eef84d379f866e3fa52e31e2",
  };

  const initializePayment = usePaystackPayment(config);

  const handlePurchase = () => {
    if (isProcessing !== null) return;
    setProcessing(plan.stars);
    
    setTimeout(() => {
      initializePayment({
        onSuccess: (ref: any) => onSuccess(ref, plan),
        onClose: () => onClose(),
      });
    }, 100);
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
      className={`relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${
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
          <span className={`text-xs ${plan.isPremium ? 'text-slate-400' : 'text-foreground/50'}`}>/ 180 days</span>
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
            onClick={handlePurchase}
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
    </div>
  );
}
