"use client";

import { useState } from "react";
import { ArrowLeft, Info, PlusCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CreateBidPage() {
  const router = useRouter();
  const [showInfoModal, setShowInfoModal] = useState(false);

  return (
    <div className="min-h-screen p-6 md:p-12 relative overflow-hidden">
      <div className="max-w-3xl mx-auto z-10 relative">
        <button
          onClick={() => router.back()}
          className="p-2 md:p-3 mb-6 bg-card-bg hover:bg-card-border border border-card-border rounded-full transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
        </button>

        <div className="glass-panel p-8 rounded-3xl">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6 border border-brand-primary/20">
            <PlusCircle className="w-8 h-8 text-brand-primary" />
          </div>

          <h1 className="text-3xl font-bold mb-4">Create Job Request (Bid)</h1>
          <p className="text-foreground/70 mb-2">
            Create a job request to allow drivers to bid on your transport needs.
          </p>

          <button 
            onClick={() => setShowInfoModal(true)}
            className="text-blue-500 font-bold text-sm mb-8 hover:underline block"
          >
            Learn how to create bids
          </button>

          <div className="text-center py-12 border-2 border-dashed border-card-border rounded-xl">
            <p className="text-foreground/50 font-medium">You have no created bids</p>
          </div>
        </div>
      </div>

      {showInfoModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card-bg dark:bg-slate-900 border border-card-border shadow-2xl rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-200 p-6 relative">
            <button 
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-xl flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
              <Info className="w-6 h-6 text-brand-primary" /> How Bidding Works
            </h3>
            <ul className="list-disc pl-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li>Your VIP tier determines how many requests you can create. Non-VIP users get 1 free request per month.</li>
              <li>Requests remain active for two weeks before automatically expiring.</li>
              <li>If you delete your own bid, or if it expires without a driver being chosen, the bid limit is not returned to you.</li>
            </ul>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowInfoModal(false)}
                className="px-6 py-2 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
