"use client";

import { X, Copy, Share2, Star } from "lucide-react";
import { toast } from "react-hot-toast";

interface ShareOverlayProps {
  onClose: () => void;
  referralLink: string;
  points: number;
}

export default function ShareOverlay({ onClose, referralLink, points }: ShareOverlayProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Nomo Cars!",
          text: "Join Nomo Cars using my link and get VIP rewards!",
          url: referralLink,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      handleCopy();
    }
  };

  // Logic for VIP Progress (Resetting per star, 0/20)
  const POINTS_PER_STAR = 20;
  const MAX_POINTS = 100;
  const cappedPoints = Math.min(points, MAX_POINTS);

  const currentStars = Math.floor(cappedPoints / POINTS_PER_STAR);
  const progressToNextStar = cappedPoints % POINTS_PER_STAR;
  const nextStarTarget = currentStars + 1 > 5 ? 5 : currentStars + 1;
  const isMaxedOut = cappedPoints >= MAX_POINTS;

  // Determine colors based on the NEXT star they are working towards
  const getStarColor = (starLevel: number) => {
    switch (starLevel) {
      case 1: return "from-blue-400 to-blue-600 shadow-blue-500/20";
      case 2: return "from-green-400 to-green-600 shadow-green-500/20";
      case 3: return "from-purple-400 to-purple-600 shadow-purple-500/20";
      case 4: return "from-pink-400 to-rose-600 shadow-pink-500/20";
      case 5: return "from-slate-700 to-black dark:from-slate-300 dark:to-white shadow-slate-900/40";
      default: return "from-brand-primary to-brand-secondary";
    }
  };

  const getStarTextColor = (starLevel: number) => {
    switch (starLevel) {
      case 1: return "text-blue-500";
      case 2: return "text-green-500";
      case 3: return "text-purple-500";
      case 4: return "text-pink-500";
      case 5: return "text-slate-800 dark:text-slate-200";
      default: return "text-brand-primary";
    }
  };

  const progressPercentage = isMaxedOut ? 100 : (progressToNextStar / POINTS_PER_STAR) * 100;
  const nextStarColorClass = getStarColor(nextStarTarget);
  const nextStarTextClass = getStarTextColor(nextStarTarget);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full md:w-[480px] bg-white dark:bg-slate-950 rounded-t-xl md:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-slate-800 relative">
          <div className="w-full absolute inset-0 flex justify-center items-center pointer-events-none">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Share2 className="w-5 h-5 text-brand-primary" /> Share & Earn
            </h3>
          </div>
          <div className="flex-1"></div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors z-10">
            <X className="w-5 h-5 text-foreground/70" />
          </button>
        </div>

        <div className="p-3 md:p-8 overflow-y-auto">
          {/* Referral Text */}
          <div className="text-center mb-8">
            <h4 className="text-xl font-black mb-2">Refer Friends, Get VIP</h4>
            <p className="text-sm text-foreground/70 leading-relaxed">
              Every user that joins through your link earns you <span className="font-bold text-brand-primary">2 points</span>.
              Collect <span className="font-bold text-amber-500">20 points</span> to earn a VIP star for free.
            </p>
          </div>

          {/* Progress Bar Section */}
          <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-4 mb-8 border border-gray-200 dark:border-slate-800 relative overflow-hidden">
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 bg-gradient-to-br ${nextStarColorClass} rounded-full blur-3xl`}></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider mb-1">Your Progress</p>
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-black ${nextStarTextClass}`}>
                    {isMaxedOut ? "MAX" : progressToNextStar}
                  </span>
                  {!isMaxedOut && <span className="text-foreground/40 font-bold">/ 20</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider mb-1">
                  {isMaxedOut ? "Max Level" : `Working towards`}
                </p>
                <div className="flex items-center gap-1 justify-end">
                  <Star className={`w-5 h-5 ${nextStarTextClass} fill-current`} />
                  <span className={`font-bold ${nextStarTextClass}`}>Star {nextStarTarget}</span>
                </div>
              </div>
            </div>

            {/* The Bar */}
            <div className="w-full h-3 md:h-4 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner relative z-10">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${nextStarColorClass} transition-all duration-1000 ease-out`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>

            <p className="text-center text-xs text-foreground/50 mt-4">
              Total Points: <span className="font-bold text-foreground">{cappedPoints}</span>
            </p>
          </div>

          {/* Social Share Buttons */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <button
              onClick={handleNativeShare}
              className="col-span-3 flex items-center justify-center gap-2 py-2 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/30"
            >
              <Share2 className="w-5 h-5" /> Continue
            </button>
            <button
              onClick={handleCopy}
              className="col-span-1 flex items-center justify-center py-2 bg-gray-100 dark:bg-slate-800 text-foreground font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700"
              title="Copy Link"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
