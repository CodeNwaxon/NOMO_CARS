"use client";

import { useState } from "react";
import { ArrowLeft, Info, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BidForJobsPage() {
  const router = useRouter();

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
          <div className="w-16 h-16 bg-brand-secondary/10 rounded-full flex items-center justify-center mb-6 border border-brand-secondary/20">
            <Briefcase className="w-8 h-8 text-brand-secondary" />
          </div>

          <h1 className="text-3xl font-bold mb-4">Bid for Jobs</h1>
          <p className="text-foreground/70 mb-8">
            Browse active passenger requests and place your bids to win the job.
          </p>

          <div className="bg-foreground/5 p-6 rounded-2xl mb-8 border border-card-border">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-brand-secondary" /> How Bidding Works
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/80">
              <li>Placing a bid consumes one of your available bids. Non-VIP drivers receive 1 free bid per month.</li>
              <li>Bids reset completely at the start of each month (they do not roll over).</li>
              <li>If a passenger deletes a job request you bid on, your bid count is returned to you.</li>
            </ul>
          </div>

          <div className="text-center py-12 border-2 border-dashed border-card-border rounded-xl">
            <p className="text-foreground/50">Job bidding form coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
