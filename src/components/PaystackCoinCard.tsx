"use client";

import { useEffect, useRef } from "react";
import { usePaystackPayment } from "react-paystack";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { createPendingPayment, finalizePayment } from "@/actions/payment";

export default function PaystackCoinCard({ pkg, user, isProcessing, setProcessing, onClose, onSuccess }: any) {
  const isInitializing = useRef(false);

  const config = {
    reference: `COIN_${Date.now()}_${Math.floor(Math.random() * 1000000000)}`,
    email: user?.email || "guest@nomocars.com",
    amount: pkg.price * 100, // Paystack expects amount in kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    metadata: {
      custom_fields: [
        {
          display_name: "Game Coins",
          variable_name: "game_coins",
          value: pkg.coins,
        },
        {
          display_name: "User ID",
          variable_name: "user_id",
          value: user?.uid || "guest",
        }
      ]
    }
  };

  const initializePayment = usePaystackPayment(config);

  useEffect(() => {
    if (isInitializing.current || isProcessing) return;
    isInitializing.current = true;
    
    const startPayment = async () => {
      setProcessing(pkg.coins);
      try {
        await createPendingPayment({
          type: "game_coins",
          userId: user?.uid || "guest",
          userEmail: user?.email || "guest@nomocars.com",
          amount: pkg.price,
          planPrice: pkg.price,
          planCoins: pkg.coins,
          reference: config.reference
        });

        initializePayment({
          onSuccess: async (reference: any) => {
            try {
              const res = await finalizePayment(reference.reference, user?.uid || "guest");
              if (res.success) {
                onSuccess(reference, pkg);
              } else {
                toast.error("Payment recorded but verification failed.");
                onClose();
              }
            } catch (err) {
              toast.error("Failed to verify payment.");
              onClose();
            } finally {
              setProcessing(null);
            }
          },
          onClose: () => {
            setProcessing(null);
            onClose();
          }
        } as any);

      } catch (err) {
        console.error("Payment init error:", err);
        toast.error("Failed to initialize payment");
        setProcessing(null);
        onClose();
      }
    };

    startPayment();
  }, [initializePayment, isProcessing, onClose, onSuccess, pkg.coins, pkg.price, setProcessing, user?.email, user?.uid]);

  return (
    <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-3xl">
      <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary mb-4" />
        <p className="font-bold text-slate-800 dark:text-slate-200">Processing Payment...</p>
        <p className="text-sm text-slate-500 mt-1">Please do not close this window.</p>
      </div>
    </div>
  );
}
